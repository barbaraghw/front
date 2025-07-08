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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://back-azq9.onrender.com/api';
const MIN_LENGTH_PASSWORD = 3;
const MIN_LENGTH_USERNAME = 3;
const MAX_LENGTH_USERNAME = 30;
const MIN_LENGTH_EMAIL = 5;
const MAX_LENGTH_EMAIL = 50;

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

    const handleTextChange = (setter: React.Dispatch<React.SetStateAction<string>>, currentText: string, newText: string, maxLength: number, fieldName: string) => {
        if (newText.length > maxLength) {
            // Solo mostrar la alerta si el texto actual es igual al máximo y se intenta escribir más
            if (currentText.length === maxLength) {
                Alert.alert('Límite de Caracteres', `El campo "${fieldName}" no puede exceder los ${maxLength} caracteres.`);
            }
            // `maxLength` en TextInput ya previene la entrada, esto es solo para la alerta
            setter(newText.substring(0, maxLength)); // Asegurarse de que no se almacene más del máximo
        } else {
            setter(newText);
        }
    };

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
     if (username.trim().length < MIN_LENGTH_USERNAME || username.trim().length > MAX_LENGTH_USERNAME) {
            Alert.alert('Error', `El nombre de usuario debe tener entre ${MIN_LENGTH_USERNAME} y ${MAX_LENGTH_USERNAME} caracteres.`);
            setLoading(false);
            return;
        }

        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Por favor, introduce un formato de email válido.');
            setLoading(false);
            return;
        }
        if (email.length < MIN_LENGTH_EMAIL || email.length > MAX_LENGTH_EMAIL) {
            Alert.alert('Error', `El email debe tener entre ${MIN_LENGTH_EMAIL} y ${MAX_LENGTH_EMAIL} caracteres.`);
            setLoading(false);
            return;
        }

         console.log('Intentando registrar con los siguientes datos:');
        console.log('Email:', email);
        console.log('Username:', username);
        console.log('Password (length):', password.length); // No imprimir la contraseña en texto plano por seguridad
        console.log('Is Critic:', isCritic);
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
            console.error('Error en la petición de registro (Axios error):', axiosError); // Log del objeto de error completo
            console.error('Respuesta de error del backend:', axiosError.response?.data); // Log de los datos de error del backend
            console.error('Código de estado HTTP:', axiosError.response?.status); // Log del código de estado

            const backendMessage = axiosError.response?.data?.message;
            let errorMessage = 'Error al registrar.'; // Mensaje por defecto

            if (backendMessage) {
                if (backendMessage.includes('email ya están registrados')) {
                    errorMessage = 'El email o nombre de usuario ya están registrados.';
                } else if (backendMessage.includes('email es requerido')) {
                    errorMessage = 'El email es un campo obligatorio.';
                } else if (backendMessage.includes('contraseña es requerida')) {
                    errorMessage = 'La contraseña es un campo obligatorio.';
                } else if (backendMessage.includes('nombre de usuario es requerido')) {
                    errorMessage = 'El nombre de usuario es un campo obligatorio.';
                } else if (backendMessage.includes('email debe tener al menos')) {
                    errorMessage = `El email debe tener al menos ${MIN_LENGTH_EMAIL} caracteres.`;
                } else if (backendMessage.includes('email no puede exceder')) {
                    errorMessage = `El email no puede exceder los ${MAX_LENGTH_EMAIL} caracteres.`;
                } else if (backendMessage.includes('contraseña debe tener al menos')) {
                    errorMessage = `La contraseña debe tener al menos ${MIN_LENGTH_PASSWORD} caracteres.`;
                }  else if (backendMessage.includes('nombre de usuario debe tener al menos')) {
                    errorMessage = `El nombre de usuario debe tener al menos ${MIN_LENGTH_USERNAME} caracteres.`;
                } else if (backendMessage.includes('nombre de usuario no puede exceder')) {
                    errorMessage = `El nombre de usuario no puede exceder los ${MAX_LENGTH_USERNAME} caracteres.`;
                } else {
                    errorMessage = backendMessage;
                }
            } else if (axiosError.request) {
                errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión o la URL de la API.';
                console.error('No se recibió respuesta:', axiosError.request);
            } else {
                errorMessage = 'Error al configurar la petición: ' + axiosError.message;
                console.error('Error de configuración de Axios:', axiosError.message);
            }
            
            Alert.alert('Error', errorMessage);
            setError(errorMessage);
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
        source={require('../../assets/l.jpg')} // Ensure this path is correct for your logo
        style={styles.logo}
      />
      <Text style={styles.title}>Create your Account</Text>

      {error ? <Text style={styles.generalErrorText}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        maxLength={MAX_LENGTH_EMAIL} // **** APLICAR MAXLENGTH ****
      />
      <TextInput
        style={styles.input}
        placeholder="Nombre de Usuario"
        placeholderTextColor="#888"
        autoCapitalize="none" // Usernames are often case-sensitive on backend, keep as is
        value={username}
        onChangeText={setUsername}
        maxLength={MAX_LENGTH_USERNAME} // **** APLICAR MAXLENGTH ****
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}// **** APLICAR MAXLENGTH ****
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}// **** APLICAR MAXLENGTH ****
      />

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

      <TouchableOpacity style={styles.primaryButton} onPress={onMainSignUpPress} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Sign Up</Text>}
      </TouchableOpacity>


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