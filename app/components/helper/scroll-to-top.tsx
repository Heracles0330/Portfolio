"use client";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import { personalData } from "@/utils/data/personal-data";
import axios from "axios";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa6";
import { FaArrowDown } from "react-icons/fa6";
import { BsChatDotsFill, BsXLg } from "react-icons/bs";

const DEFAULT_BTN_CLS =
    "fixed bottom-8 right-6 z-50 flex items-center rounded-full bg-gradient-to-r from-pink-500 to-violet-600 p-4 hover:text-xl transition-all duration-300 ease-out";
const SCROLL_THRESHOLD = 50;

const ScrollToTop = () => {
    const [btnCls, setBtnCls] = useState(DEFAULT_BTN_CLS);
    const [isUp, setIsUp] = useState(true);
    const [showCard, setShowCard] = useState(false);
    const [messages, setMessages] = useState<
        { from: "user" | "bot"; text: string; isStreaming?: boolean }[]
    >([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        document
            .getElementById("chat-end")
            ?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        setMessages((msgs) => [...msgs, { from: "user", text: input }]);
        setInput("");
        setLoading(true);

        // Add an empty bot message that will be updated with streaming content
        setMessages((msgs) => [
            ...msgs,
            { from: "bot", text: "", isStreaming: true },
        ]);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: input }),
            });

            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }

            if (!res.body) {
                throw new Error("Response body is null");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let botText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });

                chunk.split("\n").forEach((line) => {
                    if (line.startsWith("data: ")) {
                        const content = line.replace("data: ", "");
                        if (content === "[DONE]") return;
                        botText += content;
                        // Update the last message with the new content
                        setMessages((msgs) => {
                            const newMsgs = [...msgs];
                            const lastMsg = newMsgs[newMsgs.length - 1];
                            if (lastMsg.from === "bot") {
                                lastMsg.text = botText;
                            }
                            return newMsgs;
                        });
                    }
                });
            }

            // Mark the message as no longer streaming
            setMessages((msgs) => {
                const newMsgs = [...msgs];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg.from === "bot") {
                    lastMsg.isStreaming = false;
                }
                return newMsgs;
            });
        } catch (error) {
            console.error("Error sending message:", error);
            // Show error message to user
            setMessages((msgs) => {
                const newMsgs = [...msgs];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg.from === "bot") {
                    lastMsg.text =
                        "Sorry, something went wrong. Please try again.";
                    lastMsg.isStreaming = false;
                }
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        // Any existing effect logic can remain here
    }, []);

    const toggleCard = () => {
        setShowCard(!showCard);
        setIsUp(!isUp);
    };

    return (
        <>
            <Card className="fixed bottom-8 right-6 z-50 p-0 -translate-y-[52px]">
                {showCard && (
                    <div>
                        <CardHeader className="bg-gradient-to-r from-pink-500 to-violet-600 p-3 text-white font-bold rounded-t-[11px] flex flex-row items-center gap-3">
                            <Image
                                src={personalData.avatar}
                                alt="Avatar"
                                width={40}
                                height={40}
                                className="rounded-full"
                            />
                            <span className="text-xl font-bold">Heracles</span>
                        </CardHeader>
                        <CardContent className="bg-white p-4 overflow-y-auto w-[400px] h-[40vh] text-black flex flex-col justify-between">
                            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-gray-100 rounded">
                                {messages.length === 0 && (
                                    <div className="text-center text-gray-700 font-medium py-8">
                                        Ask about Heracles&apos;s information!
                                    </div>
                                )}
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${
                                            msg.from === "user"
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow
                ${
                    msg.from === "user"
                        ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white font-medium"
                        : "bg-white text-gray-800 border border-gray-300 shadow-md"
                }`}
                                        >
                                            {msg.text}
                                            {msg.isStreaming && (
                                                <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div id="chat-end" />
                            </div>

                            <div className="flex gap-2 mt-4 pt-2 border-t border-gray-300">
                                <input
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && sendMessage()
                                    }
                                    placeholder="Type your question..."
                                    disabled={loading}
                                />
                                <button
                                    className="bg-gradient-to-r from-pink-500 to-violet-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:opacity-90 transition disabled:opacity-50"
                                    onClick={sendMessage}
                                    disabled={loading || !input.trim()}
                                >
                                    Send
                                </button>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-gray-100 p-3 text-black font-medium rounded-b-[11px] flex flex-row items-center gap-2 justify-center">
                            Powered by
                            <Image
                                src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" 
                                alt="OpenAI Logo"
                                width={30}
                                height={30}
                                className="rounded-full"
                            />
                            <span className="text-pink-500"> OpenAI</span>
                        </CardFooter>
                    </div>
                )}
            </Card>
            <button className={DEFAULT_BTN_CLS} onClick={toggleCard}>
                {isUp ? <BsChatDotsFill /> : <BsXLg />}
            </button>
        </>
    );
};

export default ScrollToTop;
