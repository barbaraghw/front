import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, BottomTabParamList } from '../../App';
import axios from 'axios';
import type { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginResponse, ErrorResponse } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, introduce tu email y contraseña.');
      return;
    }

    setLoading(true); // Start loading
    try {
      // Make the login API call
      const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, { email, password });

      // Store the authentication token
      await AsyncStorage.setItem('userToken', response.data.token);

      // *** NEW/MODIFIED: Store the username from the response ***
      if (response.data.user && response.data.user.username) {
        await AsyncStorage.setItem('userName', response.data.user.username);
        console.log('Username stored:', response.data.user.username); // For debugging
      } else {
        // Fallback if username is not directly in the login response user object
        // (though we just fixed the backend for this, so this case should be rare now)
        if (response.data.user && response.data.user.email) {
          // As a last resort, if backend doesn't send username but has email,
          // you might derive a username or just save the email temporarily
          await AsyncStorage.setItem('userName', response.data.user.email.split('@')[0]);
          console.warn('Username not in response, used email prefix as fallback.');
        } else {
          console.warn('Login response did not contain user data for username.');
        }
      }

      Alert.alert('Éxito', '¡Inicio de sesión exitoso!');

      // Navigate to the MainTabs navigator, specifically to the 'MovieList' tab
      // The 'MovieList' string MUST match the 'name' property of the Tab.Screen in App.tsx
      navigation.navigate('MainTabs', {
        screen: 'Movies', // Directs to the 'MovieList' tab within 'MainTabs'
      });

    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error("Login error:", axiosError.response?.data || axiosError.message); // Log full error details
      Alert.alert(
        'Error',
        axiosError.response?.data?.message || 'Error al iniciar sesión. Intenta de nuevo.'
      );
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo de la aplicación */}
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Login to your Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#BBB" // Cambiado a un gris claro para el placeholder
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#BBB" // Cambiado a un gris claro para el placeholder
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.signUpTextContainer}>
        <Text style={styles.signUpText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.signUpLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // Cambiado a negro
    paddingHorizontal: 30,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#FFF', // Cambiado a blanco
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#333', // Fondo del input a gris oscuro
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#555', // Borde del input a gris
    fontSize: 16,
    color: '#FFF', // Texto del input a blanco
  },
  primaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E3A8A', // Un azul oscuro similar al diseño
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signUpTextContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  signUpText: {
    color: '#FFF', // Cambiado a blanco
    fontSize: 16,
  },
  signUpLink: {
    color: '#1E3A8A', // Mantenido azul para contraste, puedes ajustar si prefieres.
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;