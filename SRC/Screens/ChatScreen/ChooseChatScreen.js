import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import AppButton from "../../Components/AppButton";
import colors from "../../config/colors";
import AppText from "../../Components/AppText";
import AssistantsMenuItem from "../../Components/AssistantsComponents/AssistantsMenuItem";
import Screen from "../../Components/Screen";
import { fetchAssistants, insertChat } from "../../database";
import { useFocusEffect } from "@react-navigation/native";
import { createThread } from "../../openai-backend/ApiBackEnd";
import { DatabaseContext } from "../../DatabaseProvider"; // Adjust the import path
import { useTranslation } from "react-i18next";

function ChooseChatScreen({ navigation }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const { dbInitialized } = useContext(DatabaseContext);
  const [assistants, setAssistants] = useState([]);

  useFocusEffect(
    useCallback(() => {
      if (dbInitialized) {
        fetchAssistants()
          .then((data) => {
            setAssistants(data);
          })
          .catch((error) => {
            console.log("Error fetching assistants: ", error);
          });
      }
    }, [dbInitialized])
  );

  const createAndInstertNewThread = async (assistant_id, name) => {
    const newThread = await createThread();
    console.log("Thread created:", newThread.id);
    await insertChat(newThread.id, assistant_id, null, name);
    console.log("Inserted chat", newThread.id, assistant_id, null);
    navigation.navigate("ChatScreen", {
      assistantId: assistant_id,
      threadId: newThread.id,
    });
  };

  if (!dbInitialized) {
    return <Text>Loading...</Text>;
  }

  return (
    <Screen>
      {/* <View style={styles.container}>
        <AssistantsMenuItem
          image={require("../../assets/logo.jpg")}
          title="persian law guide"
          onPress={() => {
            createAndInstertNewThread("asst_40ROFN9nKe2V6Eka6bYXSZ2y");
          }}
          ShowEditButton={false}
        />
      </View> */}

      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={50} // Adjust the offset as needed
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topContainer}>
            <View style={styles.pictureContainer}>
              <View style={styles.pictureTipContainer}>
                <AppText style={styles.pictureTip}>
                  {t("choosingPhotoForAssistant")}
                </AppText>
              </View>
              <View style={styles.pictureWrapper}>
                <TouchableOpacity
                  style={styles.picture}
                  onPress={() => {
                    console.log("edit");
                  }}
                >
                  <Image
                    style={styles.picture}
                    source={require("../../assets/assistant.jpg")}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pictureButton}
                  onPress={() => {
                    console.log("edit");
                  }}
                >
                  <AppText style={styles.pictureButtonText}>
                    {t("edit")}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.middleContainer}>
            <AppText style={styles.midTitle}>
              {t("choosingNameForAssistant")}
            </AppText>
            <TextInput
              style={styles.midInput}
              placeholder={t("enterName")}
              value={name}
              onChangeText={setName}
            />
          </View>
          <AppButton
            title={t("done")}
            onPress={() => {
              createAndInstertNewThread("asst_40ROFN9nKe2V6Eka6bYXSZ2y", name);
            }}
            style={styles.nextButton}
            textStyle={styles.nextButtonText}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
  },
  topContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 10,
  },
  pictureContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
  },
  pictureTipContainer: {
    width: "40%",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    padding: 10,
  },
  pictureTip: {
    color: colors.dark,
    fontSize: 16,
    textAlign: "center",
  },
  pictureWrapper: {
    alignItems: "center",
  },
  picture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  pictureButton: {
    marginTop: 5,
    padding: 5,
    borderRadius: 5,
    marginTop: 10,
  },
  pictureButtonText: {
    fontSize: 12,
    color: colors.blue,
  },
  middleContainer: {
    marginTop: 20,
    width: "100%",
    padding: 10,
    alignItems: "center",
  },
  midTitle: {
    fontSize: 20,
    color: colors.dark,
    marginBottom: 10,
    textAlign: "center",
  },
  midInput: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    width: "80%",
  },
  bottomContainer: {
    marginTop: 20,
    width: "100%",
    padding: 10,
    alignItems: "center",
  },
  bottomTitle: {
    fontSize: 20,
    color: colors.dark,
    marginBottom: 10,
    textAlign: "center",
  },
  bottomInput: {
    height: 100,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    paddingTop: 10,
    width: "80%",
    textAlignVertical: "top",
  },
  nextButton: {
    backgroundColor: colors.niceBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    elevation: 2,
    marginLeft: 10,
    position: "relative",
    left: "28%",
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default ChooseChatScreen;
