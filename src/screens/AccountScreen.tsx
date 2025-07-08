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
    SafeAreaView, 
    ScrollView
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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://back-azq9.onrender.com/api';

const AccountScreen: React.FC<Props> = ({ navigation }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [loading, setLoading] = useState(true);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updatePasswordConfirm, setUpdatePasswordConfirm] = useState('');

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

    const handleUpdateProfilePress = () => {
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

        setUpdatePasswordConfirm('');
        setShowUpdateModal(true);
    };

    const confirmUpdateProfile = async () => {
        if (!updatePasswordConfirm) {
            Alert.alert('Error', 'La contraseña actual es requerida para actualizar el perfil.');
            return;
        }

        setLoading(true);
        setShowUpdateModal(false);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'No hay token de autenticación.');
                navigation.navigate('Login');
                return;
            }

            const updateData: any = { password: updatePasswordConfirm };

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
            setUpdatePasswordConfirm('');
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
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#4ADE80" />
                <Text style={styles.loadingText}>Cargando perfil...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Contenedor para el botón de atrás y el título */}
            <View style={styles.headerContainer}>
                {/* Botón de Atrás con icono de flecha */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={30} color="#fff" />
                </TouchableOpacity>

                {/* Título alineado verticalmente con el botón de atrás */}
                <Text style={styles.title}>Gestionar Cuenta</Text>
            </View>

<ScrollView contentContainerStyle={styles.scrollViewContent}> 
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

                    <TouchableOpacity style={styles.updateProfileButton} onPress={handleUpdateProfilePress}>
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
            </ScrollView>

            {/* Modal para Confirmar Eliminación de Cuenta */}
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

            {/* Nuevo Modal para Confirmar Actualización de Perfil */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showUpdateModal}
                onRequestClose={() => setShowUpdateModal(false)}
            >
                <Pressable style={styles.centeredView} onPress={() => setShowUpdateModal(false)}>
                    <View style={styles.modalView} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Confirmar Actualización de Perfil</Text>
                        <Text style={styles.modalText}>Por favor, introduce tu contraseña actual para confirmar los cambios.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tu contraseña actual"
                            placeholderTextColor="#aaa"
                            secureTextEntry
                            value={updatePasswordConfirm}
                            onChangeText={setUpdatePasswordConfirm}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonClose]}
                                onPress={() => setShowUpdateModal(false)}
                            >
                                <Text style={styles.textStyle}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonConfirmUpdate]}
                                onPress={confirmUpdateProfile}
                            >
                                <Text style={styles.textStyle}>Confirmar</Text>
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
        backgroundColor: '#000',
        paddingHorizontal: 20,
        // Eliminado alignItems: 'center' aquí para el headerContainer, se aplicará al profileSection
    },
    headerContainer: { // Nuevo contenedor para el botón de atrás y el título
        flexDirection: 'row',
        alignItems: 'center', // Alinea verticalmente el ícono y el texto
        justifyContent: 'center', // Centra el contenido horizontalmente inicialmente
        width: '100%',
        marginTop: 20, // Ajusta según la necesidad para el espacio superior
        marginBottom: 30, // Espacio entre el header y el resto del contenido
        paddingHorizontal: 10, // Un poco de padding para que el ícono no pegue al borde
    },
    backButton: {
        position: 'absolute', // Sigue usando absolute para posicionarlo a la izquierda
        left: 0, // A la izquierda del headerContainer
        // top: 0, // No es necesario si se alinea con alignItems: 'center' en headerContainer
        zIndex: 1,
        padding: 5, // Un poco de padding para facilitar el toque
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        // marginBottom: 30, // Movido al headerContainer
        color: '#fff',
        // marginTop: 20, // Movido al headerContainer
        textAlign: 'center', // Asegura que el título se centre si hay espacio
        flex: 1, // Permite que el título ocupe el espacio restante
    },
    loadingText: {
        marginTop: 20,
        fontSize: 18,
        color: '#fff',
    },
    scrollViewContent: {
        flexGrow: 1, // Esto es crucial para que el contenido dentro del ScrollView pueda expandirse y permitir el desplazamiento.
        paddingBottom: 20, // Espacio extra al final para que el último contenido no quede pegado al borde inferior
    },
    profileSection: {
        width: '100%',
        alignItems: 'center', // Para centrar los inputs y botones
    },
    label: {
        fontSize: 16,
        color: '#fff',
        alignSelf: 'flex-start',
        marginBottom: 5,
        marginTop: 10,
        fontWeight: 'bold',
    },
    emailDisplay: {
        fontSize: 18,
        color: '#fff',
        backgroundColor: '#333',
        padding: 10,
        borderRadius: 8,
        width: '100%',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#333',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#555',
        fontSize: 16,
        color: '#fff',
    },
    updateProfileButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#4ADE80',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    logoutButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#1E3A8A',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    buttonText: {
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
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalView: {
        margin: 20,
        backgroundColor: '#222',
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
        color: '#fff',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 16,
        color: '#ccc',
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
        backgroundColor: '#6B7280',
    },
    buttonConfirmDelete: {
        backgroundColor: '#DC2626',
    },
    buttonConfirmUpdate: {
        backgroundColor: '#4ADE80',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
});

export default AccountScreen;