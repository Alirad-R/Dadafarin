import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, Button, Dimensions } from "react-native";

import AssistantsMenuItem from "../../Components/AssistantsComponents/AssistantsMenuItem";
import Screen from "../../Components/Screen";
import AppText from "../../Components/AppText";

import { fetchAssistants, initDB } from "../../database";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

const { height } = Dimensions.get("window");

function AssistantMenuScreen({ navigation }) {
  const [assistants, setAssistants] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    initDB().catch((error) => {
      console.log("Error initializing database: ", error);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAssistants()
        .then((data) => {
          setAssistants(data);
        })
        .catch((error) => {
          console.log("Error fetching assistants: ", error);
        });
    }, [])
  );

  return (
    <Screen>
      <View style={styles.container}>
        {assistants.length === 0 ? (
          <View style={styles.noAss}>
            <AppText style={styles.text}>
              Build a new personal Chat GPT Assistant
            </AppText>
            <Button
              title="Get Started"
              onPress={() => navigation.navigate("AssistantMakerScreen1")}
              style={styles.button}
              textStyle={styles.buttonText}
              color="#3E84F7"
            />
          </View>
        ) : (
          <FlatList
            data={assistants}
            contentContainerStyle={styles.listContainer}
            numColumns={2}
            renderItem={({ item }) => (
              <AssistantsMenuItem
                key={item.id}
                image={require("../../assets/assistant.jpg")}
                title={item.name}
                onPress={() =>
                  navigation.navigate("AssistantEditorScreen1", {
                    id: item.id,
                  })
                }
                ShowEditButton={true}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  noAss: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    textAlign: "center",
    width: "80%",
    fontSize: 25,
    fontWeight: "bold",
  },
  button: {
    marginTop: 20,
    width: "auto",
    height: "auto",
    borderRadius: height * 0.03,
    backgroundColor: "blue",
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingVertical: 10,
  },
});

export default AssistantMenuScreen;
