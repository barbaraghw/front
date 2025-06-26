// src/screens/RegisterScreen.tsx (or wherever your RegisterScreen is located)
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App'; // Ensure this path is correct
import axios from 'axios';
import type { AxiosError } from 'axios';
import { RegisterResponse, ErrorResponse } from '../types/api'; // Ensure this path is correct

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState(''); // <--- NEW STATE FOR USERNAME
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    // Optional: Basic frontend validation for username
    if (!username.trim()) {
      Alert.alert('Error', 'El nombre de usuario no puede estar vacío.');
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert('Error', 'El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }


    try {
      // <--- INCLUDE USERNAME IN THE AXIOS POST REQUEST ---
      const response = await axios.post<RegisterResponse>(`${API_URL}/auth/register`, { email, username, password });
      Alert.alert('Éxito', response.data.message);
      navigation.goBack();
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      Alert.alert(
        'Error',
        axiosError.response?.data?.message || 'Error al registrar.'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Botón de retroceso (flecha) */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Logo de la aplicación */}
      <Image
        source={require('../../assets/logo.png')} // Ensure this path is correct for your logo
        style={styles.logo}
      />
      <Text style={styles.title}>Create your Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      {/* <--- NEW USERNAME INPUT FIELD --- */}
      <TextInput
        style={styles.input}
        placeholder="Nombre de Usuario"
        placeholderTextColor="#888"
        autoCapitalize="none" // Usernames are often case-sensitive on backend, keep as is
        value={username}
        onChangeText={setUsername}
      />
      {/* <--- END NEW USERNAME INPUT FIELD --- */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {/* Botón Principal de Registrarse */}
      <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
        <Text style={styles.primaryButtonText}>Sign Up</Text>
      </TouchableOpacity>

      {/* Ya no hay separador ni botones sociales aquí */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 30,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 30,
    color: '#333',
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
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#333',
  },
  primaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E3A8A',
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
});

export default RegisterScreen;