import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConnectionState, ShoppingItem } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decode, decodeAudioData } from '../services/audioUtils';
import { SHOPPING_TOOLS, SYSTEM_INSTRUCTION } from '../constants';

interface UseLiveSessionProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
}

export const useLiveSession = ({ items, setItems }: UseLiveSessionProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isTalking, setIsTalking] = useState(false);

  // Refs for audio and session management
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Keep items in a ref to access latest state inside callbacks without re-triggering effects
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const stopAudioPlayback = () => {
    sourceNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    sourceNodesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsTalking(false);
  };

  const executeTool = async (functionCall: any) => {
    console.log("Executing tool:", functionCall.name, functionCall.args);
    const args = functionCall.args;
    let result = { status: 'ok' };

    switch (functionCall.name) {
      case 'addItem':
        setItems(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: (args.name as string).charAt(0).toUpperCase() + (args.name as string).slice(1),
            quantity: args.quantity as string || '',
            cost: args.cost as number | undefined,
            currency: (args.currency as 'ARS' | 'USD') || 'ARS',
            bought: args.bought === true, // Support immediate buying
            timestamp: Date.now()
          }
        ]);
        break;

      case 'removeItem':
        setItems(prev => {
          const nameToRemove = (args.name as string).toLowerCase();
          return prev.filter(i => !i.name.toLowerCase().includes(nameToRemove));
        });
        break;

      case 'markAsBought':
        setItems(prev => {
          // Clean articles from search name for better matching (e.g. "el teclado" -> "teclado")
          let searchName = (args.name as string).toLowerCase();
          const articles = ['el ', 'la ', 'los ', 'las ', 'un ', 'una ', 'unos ', 'unas '];
          for (const article of articles) {
            if (searchName.startsWith(article)) {
                searchName = searchName.substring(article.length);
                break; // Only remove the first article found
            }
          }

          return prev.map(item => {
             if (item.name.toLowerCase().includes(searchName)) {
                 return {
                     ...item,
                     bought: true,
                     cost: args.cost !== undefined ? (args.cost as number) : item.cost,
                     currency: args.currency ? (args.currency as 'ARS' | 'USD') : item.currency
                 };
             }
             return item;
          });
        });
        break;
    }

    return result;
  };

  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);

      // 1. Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      // Output Audio (24kHz for Gemini)
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      // Input Audio (16kHz for Gemini)
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputContextRef.current = inputCtx;

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      
      // 3. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 4. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setConnectionState(ConnectionState.CONNECTED);

            // Setup Input Processing
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
               if (outputCtx.state === 'suspended') await outputCtx.resume();
               
               setIsTalking(true);
               const audioBuffer = await decodeAudioData(
                 decode(audioData),
                 outputCtx,
                 24000,
                 1
               );

               const node = outputCtx.createBufferSource();
               node.buffer = audioBuffer;
               node.connect(outputCtx.destination);
               
               // Scheduling
               const now = outputCtx.currentTime;
               // If next start time is in the past (gap), reset to now
               const startTime = Math.max(nextStartTimeRef.current, now);
               node.start(startTime);
               
               nextStartTimeRef.current = startTime + audioBuffer.duration;
               sourceNodesRef.current.add(node);

               node.onended = () => {
                 sourceNodesRef.current.delete(node);
                 if (sourceNodesRef.current.size === 0) {
                    setIsTalking(false);
                 }
               };
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
                stopAudioPlayback();
            }

            // Handle Tool Calls
            if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    const result = await executeTool(fc);
                    sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: {
                                name: fc.name,
                                id: fc.id,
                                response: { result }
                            }
                        });
                    });
                }
            }
          },
          onclose: () => {
            console.log("Session Closed");
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setConnectionState(ConnectionState.ERROR);
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            tools: [{ functionDeclarations: SHOPPING_TOOLS }],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Connection Failed", e);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [setItems]);

  const disconnect = useCallback(() => {
    // Close Session
    if (sessionRef.current) {
        sessionRef.current.then((session: any) => session.close());
        sessionRef.current = null;
    }

    // Close Audio Contexts
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }

    stopAudioPlayback();
    setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  // Automatic cleanup when leaving app or unmounting
  useEffect(() => {
    const handleVisibilityChange = () => {
        // If the user minimizes the app or switches tabs, disconnect the mic
        if (document.visibilityState === 'hidden') {
            console.log("App hidden, disconnecting...");
            disconnect();
        }
    };

    const handleBeforeUnload = () => {
        disconnect();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Ensure disconnect happens on component unmount
        disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, connectionState, isTalking };
};