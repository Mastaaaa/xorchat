"use client";
import { useState, useEffect, useRef } from "react";
import { getCurrentTimeUTC } from "./utility";
import WebSocketClient from "./client"; // Import WebSocket functions and types
import { ServerCMD, ClientCMD, ClientPayload } from "../types"; // Import the types for client commands

const commands = ["username", "key", "clear", "join", "leave"];

export default function Input({ setMessages, setMembers }) {
  const [username, setUsername] = useState("guest");
  const [message, setMessage] = useState("");

  const [room, setRoom] = useState("local");

  const [key, setKey] = useState();
  const [showCommands, setShowCommands] = useState(false);
  const [animationState, setAnimationState] = useState(3);
  const [filteredCommands, setFilteredCommands] = useState(commands);

  const inputRef = useRef(null);

  const [client, setClient] = useState(null);

  const serverCallback = (payload) => {
    const current_time = getCurrentTimeUTC();

    switch (payload.cmd) {
      case ServerCMD.INFO:
        setMessages((prev) => [
          ...prev,
          {
            username: "system",
            text: payload.data.message,
            time: current_time,
          },
        ]);
        break;
      case ServerCMD.MESSAGE:
        setMessages((prev) => [
          ...prev,
          {
            username: payload.data.username,
            text: payload.data.message,
            time: current_time,
          },
        ]);
        break;
      case ServerCMD.ERROR:
        setMessages((prev) => [
          ...prev,
          {
            username: "system",
            text: `Error: ${payload.data.message}`,
            time: current_time,
          },
        ]);
        break;

      case ServerCMD.MEMBERS: {
        setMembers(payload.data.members);
        console.log(payload.data.members);
        break;
      }
      default:
        console.log("Unknown payload command", payload.cmd);
    }
  };

  const handleCommand = (commandMessage) => {
    const [command, ...contentArr] = commandMessage.split(" "); // Split by space
    const content = contentArr.join(" ").trim(); // Get the content after the command name
    const current_time = getCurrentTimeUTC();

    const check_content = () => {
      if (!content) {
        setMessages((prev) => [
          ...prev,
          {
            username: "system",
            text: `The command '${command}' requires an argument.`,
            time: current_time,
          },
        ]);
        return false;
      }
      return true;
    };

    // Handle different commands
    switch (command) {
      case "/key":
        if (!check_content()) return;
        setKey(content); // Set new key
        setMessages((prev) => [
          ...prev,
          {
            username: "system",
            text: `Key has been changed`,
            time: current_time,
          },
        ]);
        break;
      case "/username":
        if (!check_content()) return;
        setUsername(content); // Set new username
        client.sendPayload({
          cmd: ClientCMD.CHANGE_USERNAME,
          data: { username: content },
        }); // Send username change payload
        setMessages((prev) => [
          ...prev,
          {
            username: "system",
            text: `Username changed to ${content}`,
            time: current_time,
          },
        ]);
        break;
      case "/join":
        if (!check_content()) return;
        setRoom(content); // Set new room
        client.sendPayload({
          cmd: ClientCMD.JOIN_ROOM,
          data: { room: content },
        }); // Send join room payload
        setMessages((prev) => [
          ...prev,
          {
            username: "system",
            text: `Room changed to ${content}`,
            time: current_time,
          },
        ]);
        break;
      case "/leave":
        client.sendPayload({
          cmd: ClientCMD.LEAVE_ROOM,
          data: { room: room },
        }); // Send join room payload
        setRoom("local"); // Set new room
        setMessage([]);
        setMessages((prev) => [
          ...prev,
          {
            username: "system",
            text: `Left the room ${content}`,
            time: current_time,
          },
        ]);
        break;
      case "/clear":
        setMessages([]); // Clear chat
        break;
      default:
        setMessages((prev) => [
          ...prev,
          {
            username: "system",
            text: `Unknown command '${command}'`,
            time: current_time,
          },
        ]);
        break;
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      if (message.startsWith("/")) {
        handleCommand(message);
        setMessage(""); // Clear input after sending
      } else {
        const current_time = getCurrentTimeUTC();
        client.sendPayload({
          cmd: ClientCMD.MESSAGE,
          data: { message, room, username },
        }); // Send message payload to server
        // setMessages((prev) => [
        //   ...prev,
        //   { username: username, text: message, time: current_time },
        // ]);
        setMessage(""); // Clear input after sending
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (value.startsWith("/")) {
      setShowCommands(true);

      const searchTerm = value.slice(1).toLowerCase();
      setFilteredCommands(
        commands.filter((cmd) => cmd.toLowerCase().includes(searchTerm)),
      );
    } else {
      setShowCommands(false);
    }
  };

  const handleCommandSelect = (commandName) => {
    setMessage(`/${commandName} `);
    setShowCommands(false);
    inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
      setShowCommands(false);
    } else if (e.key === "Tab" && showCommands && filteredCommands.length > 0) {
      e.preventDefault();
      handleCommandSelect(filteredCommands[0]);
    }
    // handle arrows for commands
  };

  const animationSpec = [
    "animate-blurOut animate-zoomOut",
    "animate-blurIn animate-zoomIn",
    "",
    "invisible pointer-events-none",
  ];

  useEffect(() => {
    if (showCommands) {
      setAnimationState(1); // Trigger "enter" animation
      setTimeout(() => {
        setAnimationState(2); // Stop animation after hiding commands
      }, 200);
    } else if (!showCommands && animationState === 2) {
      setAnimationState(0); // Trigger "exit" animation
      setTimeout(() => {
        setAnimationState(3); // Stop animation after hiding commands
      }, 200);
    }
  }, [showCommands]);

  useEffect(() => {
    const wsClient = new WebSocketClient(process.env.NEXT_PUBLIC_WS_URL ?? "");
    wsClient.setCallback(serverCallback);
    console.log("System status is: ", wsClient.isConnectedStatus);

    setClient(wsClient);
  }, []);

  function CommandList() {
    return (
      <div
        className={`absolute -mt-[8.5rem] -ml-1 sm:ml-1 z-50 h-36 w-full
          flex flex-col justify-end bg-transparent
          ${filteredCommands.length === 0 ? "pointer-events-none" : animationState == 3 ? "pointer-events-none" : ""}
          `}
      >
        <div
          className={`w-full backdrop-blur-lg ${animationSpec[animationState]}`}
        >
          {filteredCommands.map((cmd) => (
            <div
              key={cmd}
              className="cursor-pointer p-1.5 text-gray-400
              transition-color ease-out duration-200
              hover:text-bg hover:bg-primary"
              onClick={() => handleCommandSelect(cmd)}
            >
              /{cmd}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col sm:flex-row flex-grow mt-4">
      <div className="flex mt-0 sm:mt-3 text-primary w-fit h-fit text-nowrap">
        <div>{username}</div>
        <div>@</div>
        <div>{room}</div>
        <div>:</div>
      </div>
      <div className="relative w-full">
        {<CommandList />}
        <input
          className="bg-transparent placeholder:text-neutral-700 text-base resize-none min-w-full py-2 px-0 sm:px-2"
          value={message}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange}
          ref={inputRef}
          placeholder="Type your message here."
        />
      </div>
    </div>
  );
}
