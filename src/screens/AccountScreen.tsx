import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal, // Importar Modal
  Pressable // Importar Pressable para el modal
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import axios from 'axios';
import type { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorResponse } from '../types/api';

type UserProfile = {
  id: string;
  email: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const AccountScreen: React.FC<Props> = ({ navigation }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // Para actualizar email/password
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Nuevo estado para el modal
  const [deletePassword, setDeletePassword] = useState(''); // Contraseña para eliminar

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión.');
        navigation.navigate('Login');
        return;
      }
      const response = await axios.get<UserProfile>(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
      setNewEmail(response.data.email);
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      Alert.alert('Error', axiosError.response?.data?.message || 'Error al cargar el perfil.');
      console.error('Error al cargar el perfil:', axiosError.response?.data || axiosError.message);
      if (axiosError.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        navigation.navigate('Login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleUpdateProfile = async () => {
    if (!currentPassword) {
        Alert.alert('Error', 'Por favor, introduce tu contraseña actual para confirmar los cambios.');
        return;
    }
    if (newPassword && newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Las nuevas contraseñas no coinciden.');
      return;
    }
    if (newPassword && newPassword === currentPassword) {
        Alert.alert('Error', 'La nueva contraseña no puede ser igual a la actual.');
        return;
    }
    if (newEmail === user?.email && !newPassword) {
        Alert.alert('Información', 'No hay cambios que guardar.');
        return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No hay token de autenticación.');
        navigation.navigate('Login');
        return;
      }

      const updateData: any = { password: currentPassword };

      if (newEmail !== user?.email) {
        updateData.email = newEmail;
      }
      if (newPassword) {
        updateData.newPassword = newPassword;
      }

      const response = await axios.put(`${API_URL}/users/me`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Éxito', response.data.message);
      if (updateData.email) {
          await fetchUserProfile();
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      Alert.alert('Error', axiosError.response?.data?.message || 'Error al actualizar el perfil.');
      console.error('Error al actualizar perfil:', axiosError.response?.data || axiosError.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la eliminación de cuenta (activará el modal)
  const handleDeleteAccountPress = () => {
    setDeletePassword(''); // Limpiar el campo antes de mostrar el modal
    setShowDeleteModal(true);
  };

  // Función para confirmar la eliminación desde el modal
  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'La contraseña es requerida para eliminar la cuenta.');
      return;
    }

    setLoading(true);
    setShowDeleteModal(false); // Cerrar el modal
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No hay token de autenticación.');
        navigation.navigate('Login');
        return;
      }

      await axios.delete(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword },
      });
      await AsyncStorage.removeItem('userToken');
      Alert.alert('Éxito', 'Tu cuenta ha sido eliminada exitosamente.');
      navigation.navigate('Login');
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      Alert.alert('Error', axiosError.response?.data?.message || 'Error al eliminar la cuenta.');
      console.error('Error al eliminar cuenta:', axiosError.response?.data || axiosError.message);
    } finally {
      setLoading(false);
      setDeletePassword(''); // Limpiar el campo de la contraseña de eliminación
    }
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Gestionar Cuenta</Text>

      {user && (
        <View style={styles.profileSection}>
          <Text style={styles.label}>Email actual:</Text>
          <Text style={styles.emailDisplay}>{user.email}</Text>

          <Text style={styles.label}>Nuevo Email (opcional):</Text>
          <TextInput
            style={styles.input}
            placeholder="Introduce nuevo email"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newEmail}
            onChangeText={setNewEmail}
          />

          <Text style={styles.label}>Contraseña Actual:</Text>
          <TextInput
            style={styles.input}
            placeholder="Contraseña actual"
            placeholderTextColor="#888"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Text style={styles.label}>Nueva Contraseña (opcional):</Text>
          <TextInput
            style={styles.input}
            placeholder="Nueva Contraseña"
            placeholderTextColor="#888"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmar Nueva Contraseña"
            placeholderTextColor="#888"
            secureTextEntry
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateProfile}>
            <Text style={styles.primaryButtonText}>Actualizar Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccountPress}>
            <Text style={styles.deleteButtonText}>Eliminar Cuenta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para confirmar eliminación de cuenta */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable style={styles.centeredView} onPress={() => setShowDeleteModal(false)}>
          <View style={styles.modalView} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Confirmar Eliminación de Cuenta</Text>
            <Text style={styles.modalText}>Por favor, introduce tu contraseña para confirmar que quieres eliminar tu cuenta. Esta acción es irreversible.</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu contraseña"
              placeholderTextColor="#888"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonClose]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.textStyle}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonConfirmDelete]}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.textStyle}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 80,
    alignItems: 'center',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#555',
  },
  profileSection: {
    width: '100%',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#555',
    alignSelf: 'flex-start',
    marginBottom: 5,
    marginTop: 10,
    fontWeight: 'bold',
  },
  emailDisplay: {
    fontSize: 18,
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
    marginBottom: 20,
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
    marginTop: 20,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos del Modal
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Fondo oscuro semitransparente
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
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
    width: '90%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    width: '45%',
    alignItems: 'center',
  },
  buttonClose: {
    backgroundColor: '#6B7280', // Gris
  },
  buttonConfirmDelete: {
    backgroundColor: '#DC2626', // Rojo
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default AccountScreen;