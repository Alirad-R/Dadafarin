import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import AppTextInput from "../../Components/ChatComponents/AppTextInput";
import Screen from "../../Components/Screen";
import Chatbubble from "../../Components/ChatComponents/Chatbubble";
import {
  addMessageToThread,
  createThread,
} from "../../openai-backend/ApiBackEnd";
import {
  insertChatMessage,
  fetchChatHistory,
  insertChat,
  updateChatItemById,
} from "../../database";
import { DatabaseContext } from "../../DatabaseProvider"; // Adjust the import path
import * as SecureStore from "expo-secure-store";
import { useHeaderHeight } from "@react-navigation/elements";

const ChatScreen = ({ navigation, route }) => {
  const { dbInitialized } = useContext(DatabaseContext);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamedChunks, setStreamedChunks] = useState("");
  const [completeResponse, setCompleteResponse] = useState(null);
  const assistantId = route.params.assistantId;
  const threadId = route.params.threadId; // this can be null

  const threadRef = useRef(null);
  const flatListRef = useRef(null); // Reference for FlatList

  useEffect(() => {
    const initializeThread = async () => {
      if (!dbInitialized) return; // Wait for the database to be initialized

      if (threadId === null) {
        console.log("Creating new thread...");
        try {
          const newThread = await createThread();
          threadRef.current = newThread.id;
          console.log("Thread created:", threadRef.current);

          await insertChat(threadRef.current, assistantId, null);
          console.log("Inserted chat", threadRef.current, assistantId, null);
        } catch (error) {
          console.error("Error initializing thread:", error);
        }
      } else {
        threadRef.current = threadId;
        console.log("Using existing thread:", threadRef.current);
        console.log("Fetching chat history...");
        try {
          const chatHistory = await fetchChatHistory(threadRef.current);
          console.log("Chat history fetched:", chatHistory);
          setConversation(chatHistory);
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };

    initializeThread();
  }, [threadId, dbInitialized]); // Add dbInitialized as a dependency

  const handleStreamedEvent = (event) => {
    console.log("Streamed event received:", event); // Debugging
    console.log("event.object:", event.object);
    switch (event.object) {
      case "thread.message.delta":
        if (event.delta.content) {
          const content = event.delta.content[0].text.value;
          setStreamedChunks((prevChunks) => prevChunks + content);
          console.log("Updated streamedChunks:", streamedChunks + content); // Debugging
        }
        break;
      case "thread.message":
        if (event.status === "completed") {
          const finalMessage = event.content[0].text.value;
          console.log("finalMessage********", finalMessage);
          setCompleteResponse(finalMessage);
          setLoading(false);
          addFinalMessageToConversation(finalMessage);
          setStreamedChunks(""); // Clear the streamed chunks
          console.log("Final message received:", finalMessage); // Debugging
        }
        break;
      default:
        break;
    }
  };

  const runThreadWithStreaming = async (
    threadId,
    assistantId,
    apiKey,
    handleStreamedEvent,
    setIsLoading
  ) => {
    try {
      const runResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
          body: JSON.stringify({ assistant_id: assistantId, stream: true }),
        }
      );

      if (!runResponse.ok) {
        throw new Error(`HTTP error! status: ${runResponse.status}`);
      }

      const responseText = await runResponse.text();
      console.log("Response text received:", responseText); // Debugging

      const handleStreamedResponse = (value) => {
        const lines = value.split("\n");
        for (const line of lines) {
          if (line.trim().startsWith("data:")) {
            const data = line.trim().slice(5).trim();
            if (data === "[DONE]") {
              setIsLoading(false);
            } else {
              try {
                const event = JSON.parse(data);
                handleStreamedEvent(event);
              } catch (error) {
                console.error("Error parsing streamed response:", error);
              }
            }
          }
        }
      };

      const simulateStream = async (text) => {
        const lines = text.split("\n");
        for (const line of lines) {
          if (line) {
            handleStreamedResponse(line);
            await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate delay between chunks
          }
        }
      };

      await simulateStream(responseText);
    } catch (error) {
      console.error("Error running thread:", error);
      setIsLoading(false);
    }
  };

  const callAssistant = async (message, assistantId) => {
    const apiKey = await SecureStore.getItemAsync("apiKey");
    setLoading(true);
    setStreamedChunks("");
    setCompleteResponse(null);
    if (threadRef.current === null) {
      console.log("Thread not initialized yet.");
      setLoading(false);
      return;
    }
    console.log("in chat screen call assistant", assistantId);
    try {
      console.log("Calling assistant with thread:", threadRef.current);
      await addMessageToThread(threadRef.current, message);
      await runThreadWithStreaming(
        threadRef.current,
        assistantId,
        apiKey,
        handleStreamedEvent,
        setLoading
      );
    } catch (error) {
      console.error("Error calling assistant:", error);
    }
  };

  const addMessageToConversationAndDB = (role, content) => {
    setConversation((prevConversation) => [
      ...prevConversation,
      {
        threadId: threadRef.current,
        content: content,
        role: role,
        timestamp: new Date(),
      },
    ]);
    insertChatMessage(threadRef.current, content, role).catch(console.error);
    console.log("Message added to conversation and DB");
    console.log("Updating chatItem in DB, content:", content);

    updateChatItemById(threadRef.current, content.slice(0, 25) + "...").catch(
      console.error
    );
    console.log("ChatItem updated in DB");
  };

  const addFinalMessageToConversation = (content) => {
    setConversation((prevConversation) => [
      ...prevConversation,
      {
        threadId: threadRef.current,
        content: content,
        role: "assistant",
        timestamp: new Date(),
      },
    ]);
    insertChatMessage(threadRef.current, content, "assistant").catch(
      console.error
    );
    console.log("Final message added to conversation and DB");
    console.log("Updating chatItem in DB, content:", content);

    updateChatItemById(threadRef.current, content.slice(0, 25) + "...").catch(
      console.error
    );
    console.log("ChatItem updated in DB");
  };

  const handleSetMessage = (newMessage) => {
    if (loading) {
      console.error("Still loading, please wait");
      return;
    }

    addMessageToConversationAndDB("user", newMessage);
    callAssistant(newMessage, assistantId);
  };

  // Scroll to bottom when conversation or streamedChunks changes
  useEffect(() => {
    scrollToBottom();
  }, [conversation, streamedChunks]);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  };

  if (!dbInitialized) {
    return <Text>Loading...</Text>;
  }
  const headerHeight = useHeaderHeight();

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? headerHeight : headerHeight * 2
        } // put the botttom tab nav height here
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ImageBackground
            source={require("../../assets/background2.jpg")}
            style={styles.background}
          >
            <View style={styles.container}>
              <FlatList
                ref={flatListRef} // Attach the ref here
                data={conversation}
                keyExtractor={(item, index) =>
                  `${item.threadId}-${item.role}-${index}`
                }
                renderItem={({ item }) => <Chatbubble message={item} />}
                contentContainerStyle={styles.flatListContent}
                ListFooterComponent={
                  streamedChunks && !completeResponse ? (
                    <Chatbubble
                      message={{
                        content: streamedChunks,
                        role: "assistant",
                        timestamp: new Date(),
                      }}
                    />
                  ) : null
                }
              />
              <AppTextInput onSubmit={handleSetMessage} />
            </View>
          </ImageBackground>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContent: {
    padding: 10,
  },
  background: {
    flex: 1,
    resizeMode: "cover",
  },
});

export default ChatScreen;
