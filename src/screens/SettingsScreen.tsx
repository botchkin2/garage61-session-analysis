import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG} from '@/config/api';
import {RacingTheme} from '@/theme';

const SettingsScreen = ({navigation}: any) => {
  const [apiToken, setApiToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStoredToken();
  }, []);

  const loadStoredToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEY);
      if (storedToken) {
        setApiToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading stored token:', error);
    }
  };

  const saveToken = async () => {
    if (!apiToken.trim()) {
      Alert.alert('Error', 'Please enter an API token');
      return;
    }

    setIsLoading(true);
    try {
      await AsyncStorage.setItem(API_CONFIG.STORAGE_KEY, apiToken.trim());
      Alert.alert('Success', 'API token saved successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      console.error('Error saving token:', error);
      Alert.alert('Error', 'Failed to save API token');
    } finally {
      setIsLoading(false);
    }
  };

  const clearToken = async () => {
    Alert.alert(
      'Clear Token',
      'Are you sure you want to clear the stored API token?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEY);
              setApiToken('');
              Alert.alert('Success', 'API token cleared');
            } catch (error) {
              console.error('Error clearing token:', error);
              Alert.alert('Error', 'Failed to clear API token');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>API Settings</Text>
        <Text style={styles.description}>
          Enter your Garage 61 API token to access lap data. You can find your
          token in your Garage 61 account settings.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>API Token</Text>
          <TextInput
            style={styles.input}
            value={apiToken}
            onChangeText={setApiToken}
            placeholder='Enter your Garage 61 API token'
            placeholderTextColor={RacingTheme.colors.textSecondary}
            secureTextEntry={true}
            autoCapitalize='none'
            autoCorrect={false}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveToken}
            disabled={isLoading}>
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Token'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearToken}
            disabled={isLoading}>
            <Text style={styles.clearButtonText}>Clear Token</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How to get your API token:</Text>
          <Text style={styles.infoText}>
            1. Log in to your Garage 61 account{'\n'}
            2. Go to Account Settings{'\n'}
            3. Find the API section{'\n'}
            4. Copy your personal access token
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RacingTheme.colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: RacingTheme.colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: RacingTheme.colors.textSecondary,
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: RacingTheme.colors.text,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: RacingTheme.colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: RacingTheme.colors.text,
    backgroundColor: RacingTheme.colors.surface,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 40,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: RacingTheme.colors.primary,
  },
  saveButtonText: {
    color: RacingTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: RacingTheme.colors.error,
  },
  clearButtonText: {
    color: RacingTheme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: RacingTheme.colors.surface,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: RacingTheme.colors.border,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: RacingTheme.colors.text,
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: RacingTheme.colors.textSecondary,
    lineHeight: 20,
  },
});

export default SettingsScreen;
