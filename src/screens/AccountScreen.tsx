import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Modal,
    Pressable,
    SafeAreaView // Importar SafeAreaView
} from 'react-native';

import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, BottomTabParamList } from '../../App';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { AxiosError } from 'axios';
import { ErrorResponse } from '../types/api';

type UserProfile = {
    id: string;
    email: string;
};

type Props = CompositeScreenProps<
    BottomTabScreenProps<BottomTabParamList, 'Account'>,
    NativeStackScreenProps<RootStackParamList>
>;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

const AccountScreen: React.FC<Props> = ({ navigation }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

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

    const handleDeleteAccountPress = () => {
        setDeletePassword('');
        setShowDeleteModal(true);
    };

    const confirmDeleteAccount = async () => {
        if (!deletePassword) {
            Alert.alert('Error', 'La contraseña es requerida para eliminar la cuenta.');
            return;
        }

        setLoading(true);
        setShowDeleteModal(false);
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
            setDeletePassword('');
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres cerrar sesión?",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Sí",
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem('userToken');
                            Alert.alert('Sesión Cerrada', 'Has cerrado sesión exitosamente.');
                            navigation.navigate('Login');
                        } catch (e) {
                            console.error("Error al cerrar sesión:", e);
                            Alert.alert('Error', 'No se pudo cerrar la sesión.');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}> {/* Wrapped with SafeAreaView */}
                <ActivityIndicator size="large" color="#4ADE80" />
                <Text style={styles.loadingText}>Cargando perfil...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}> {/* Wrapped with SafeAreaView */}
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
                        placeholderTextColor="#aaa"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={newEmail}
                        onChangeText={setNewEmail}
                    />

                    <Text style={styles.label}>Contraseña Actual:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña actual"
                        placeholderTextColor="#aaa"
                        secureTextEntry
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                    />

                    <Text style={styles.label}>Nueva Contraseña (opcional):</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nueva Contraseña"
                        placeholderTextColor="#aaa"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirmar Nueva Contraseña"
                        placeholderTextColor="#aaa"
                        secureTextEntry
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                    />

                    <TouchableOpacity style={styles.updateProfileButton} onPress={handleUpdateProfile}>
                        <Text style={styles.buttonText}>Actualizar Perfil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.buttonText}>Cerrar Sesión</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccountPress}>
                        <Text style={styles.buttonText}>Eliminar Cuenta</Text>
                    </TouchableOpacity>
                </View>
            )}

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
                            placeholderTextColor="#aaa"
                            secureTextEntry
                            value={deletePassword}
                            onChangeText={setDeletePassword}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonClose]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonConfirmDelete]}
                                onPress={confirmDeleteAccount}
                            >
                                <Text style={styles.buttonText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Black background
        paddingHorizontal: 20,
        // Removed paddingTop from here as SafeAreaView handles it
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 60, // Keep this for relative positioning from the top of SafeAreaView
        left: 20,
        zIndex: 1,
    },
    backButtonText: {
        fontSize: 30,
        color: '#fff', // White text
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#fff', // White text
        marginTop: 20, // Add some top margin to account for SafeAreaView padding
    },
    loadingText: {
        marginTop: 20,
        fontSize: 18,
        color: '#fff', // White text
    },
    profileSection: {
        width: '100%',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        color: '#fff', // White text
        alignSelf: 'flex-start',
        marginBottom: 5,
        marginTop: 10,
        fontWeight: 'bold',
    },
    emailDisplay: {
        fontSize: 18,
        color: '#fff', // White text
        backgroundColor: '#333', // Darker background for display
        padding: 10,
        borderRadius: 8,
        width: '100%',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#333', // Darker background for input
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#555', // Darker border
        fontSize: 16,
        color: '#fff', // White text
    },
    updateProfileButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#4ADE80', // New color for "Actualizar Perfil"
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    logoutButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#1E3A8A', // Original color of "Actualizar Perfil"
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    buttonText: { // Reused for all main buttons
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
    // Estilos del Modal
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', // Darker semi-transparent background for modal
    },
    modalView: {
        margin: 20,
        backgroundColor: '#222', // Darker modal background
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
        color: '#fff', // White text
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 16,
        color: '#ccc', // Lighter grey for modal text
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
        backgroundColor: '#6B7280', // Grey
    },
    buttonConfirmDelete: {
        backgroundColor: '#DC2626', // Red
    },
    textStyle: { // Used for modal buttons (could be merged with buttonText for consistency)
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
});

export default AccountScreen;