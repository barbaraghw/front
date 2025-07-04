// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert, // Ya importado, no duplicar
  Image,
  ActivityIndicator,
  Modal, // Importar Modal
  Switch, // Importar Switch
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App'; // Ensure this path is correct
import axios from 'axios';
import type { AxiosError } from 'axios';
import { RegisterResponse, ErrorResponse } from '../types/api'; // Ensure this path is correct
import { Ionicons } from '@expo/vector-icons';


type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const CRITIC_SECRET_KEY = "VALIDOESCRITICO"; // La clave hardcodeada

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // Estado para mensajes de error generales

  // NUEVOS ESTADOS para el registro de crítico
  const [isCritic, setIsCritic] = useState(false);
  const [showCriticModal, setShowCriticModal] = useState(false);
  const [criticKeyInput, setCriticKeyInput] = useState('');

   const handleRegister = async (registerAsCritic: boolean) => {
    // Restablecer error antes de cada intento de registro
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    // Optional: Basic frontend validation for username
    if (!username.trim()) {
      Alert.alert('Error', 'El nombre de usuario no puede estar vacío.');
      setLoading(false);
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert('Error', 'El nombre de usuario debe tener al menos 3 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // INCLUIR EL CAMPO isCritic EN EL PAYLOAD
      const response = await axios.post<RegisterResponse>(`${API_URL}/auth/register`, {
        email,
        username,
        password,
        isCritic: isCritic, // <--- AÑADIDO: Envía el estado isCritic al backend
      });

      Alert.alert('Éxito', response.data.message);
      navigation.goBack();
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      const errorMessage = axiosError.response?.data?.message || 'Error al registrar.';
      Alert.alert('Error', errorMessage);
      setError(errorMessage); // Mostrar el error en pantalla si lo deseas
    } finally {
      setLoading(false);
    }
  };

  // NUEVA FUNCIÓN para validar la clave de crítico
  const handleValidateCriticKey = () => {
    if (criticKeyInput === CRITIC_SECRET_KEY) {
      setIsCritic(true); // Confirma que es un crítico
      setShowCriticModal(false); // Cierra el modal
      setCriticKeyInput(''); // Limpia el input del modal
      Alert.alert("Validación Exitosa", "¡Ahora estás registrado como crítico!");
    } else {
      setIsCritic(false); // Si la clave es incorrecta, asegúrate de que no sea crítico
      Alert.alert("Validación Fallida", "Clave incorrecta. Por favor, inténtalo de nuevo o desmarca 'Usuario Crítico'.");
    }
  };

  const onMainSignUpPress = () => {
    if (isCritic) {
      // If the switch is ON, it means they already went through the modal
      // or they just toggled it on and the modal showed.
      // If the modal is not visible, it means they have successfully validated.
      // So, we proceed with registration as critic.
      handleRegister(true);
    } else {
      // If the switch is OFF, register as a regular user
      handleRegister(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Botón de retroceso (flecha) */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={30} color="#fff" /> {/* <-- CAMBIO AQUÍ */}
      </TouchableOpacity>

      {/* Logo de la aplicación */}
      <Image
        source={require('../../assets/logo.png')} // Ensure this path is correct for your logo
        style={styles.logo}
      />
      <Text style={styles.title}>Create your Account</Text>

      {error ? <Text style={styles.generalErrorText}>{error}</Text> : null} {/* Mostrar error general */}

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

      {/* NUEVA SECCIÓN: Checkbox/Switch para usuario crítico */}
      <View style={styles.criticOptionContainer}>
        <Text style={styles.criticOptionText}>Register as Critic User?</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#FFD700" }} // Dorado para "on"
          thumbColor={isCritic ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={(value) => {
            if (value) {
              setShowCriticModal(true); // Abre el modal si se activa
            } else {
              setIsCritic(false); // Simplemente desactiva
              setCriticKeyInput(''); // Limpia el input por si acaso
            }
          }}
          value={isCritic}
        />
      </View>

      {/* Botón Principal de Registrarse */}
      <TouchableOpacity style={styles.primaryButton} onPress={onMainSignUpPress} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Sign Up</Text>}
      </TouchableOpacity>


      {/* Ya no hay separador ni botones sociales aquí */}

      {/* MODAL para la validación de crítico */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCriticModal}
        onRequestClose={() => {
          // Si el usuario cierra el modal sin validar, asegúrate de que el switch esté en off
          setShowCriticModal(false);
          setIsCritic(false); // Asume que canceló o no validó
          setCriticKeyInput(''); // Limpiar el input
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Enter Critic Validation Key</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Key"
              placeholderTextColor="#888"
              value={criticKeyInput}
              onChangeText={setCriticKeyInput}
              autoCapitalize="none"
              secureTextEntry // Puedes quitar esto si quieres que la clave sea visible
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonClose]}
                onPress={() => {
                  setShowCriticModal(false);
                  setIsCritic(false); // Desactiva el switch si se cancela el modal
                  setCriticKeyInput('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonValidate]}
                onPress={handleValidateCriticKey}
              >
                <Text style={styles.modalButtonText}>Validate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A', // Fondo oscuro como tu estilo
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
    color: '#FFF', // Texto blanco para el botón de retroceso
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
    color: '#FFF', // Título en blanco
  },
  generalErrorText: { // Estilo para el mensaje de error general
    color: '#FF6347',
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#1C1C1C', // Fondo de input más oscuro
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333', // Borde un poco más oscuro
    fontSize: 16,
    color: '#FFF', // Texto del input blanco
  },
  primaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E3A8A', // Tu color principal de botón
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
  // NUEVOS ESTILOS para la opción de crítico y el modal
  criticOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  criticOptionText: {
    color: '#FFF',
    fontSize: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fondo semi-transparente para el modal
  },
  modalView: {
    margin: 20,
    backgroundColor: '#1C1C1C', // Fondo del modal oscuro
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#0A0A0A', // Fondo de input en el modal más oscuro
    padding: 10,
    borderRadius: 8,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonClose: {
    backgroundColor: '#555',
  },
  modalButtonValidate: {
    backgroundColor: '#4ADE80', // Un verde para el botón de validar
  },
  modalButtonText: { // Nombre cambiado de textStyle a modalButtonText para evitar conflictos
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RegisterScreen;