// src/screens/AddCommentScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';

type AddCommentScreenProps = NativeStackScreenProps<RootStackParamList, 'AddComment'>;

const AddCommentScreen: React.FC<AddCommentScreenProps> = ({ route, navigation }) => {
    const { movieId, movieTitle, movieYear, posterPath, commentId, initialText, initialRating } = route.params;

    const [rating, setRating] = useState(initialRating || 0);
    const [commentText, setCommentText] = useState(initialText || '');
    const [loading, setLoading] = useState(false);

    // Estados para movieYear y posterPath que pueden ser actualizados
    const [currentMovieYear, setCurrentMovieYear] = useState(movieYear || '');
    const [currentPosterPath, setCurrentPosterPath] = useState(posterPath || '');

    const isEditing = !!commentId;

    useEffect(() => {
        // Si no tenemos movieYear o posterPath (ej. viniendo de CommentsScreen para edición),
        // los obtenemos de la API de películas.
        const fetchMovieDetailsIfNeeded = async () => {
            if (!currentMovieYear || !currentPosterPath) {
                try {
                    const token = await AsyncStorage.getItem('userToken');
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};
                    const response = await axios.get(`${API_URL}/movies/${movieId}`, { headers });
                    if (response.data && response.data.data) {
                        const movieData = response.data.data;
                        if (movieData.release_date) {
                            setCurrentMovieYear(new Date(movieData.release_date).getFullYear().toString());
                        }
                        if (movieData.poster_path) {
                            setCurrentPosterPath(movieData.poster_path);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch movie details for AddCommentScreen:', error);
                }
            }
        };

        fetchMovieDetailsIfNeeded();
    }, [movieId, currentMovieYear, currentPosterPath]); // Dependencias para re-ejecutar si cambian


    const handleStarPress = (selectedRating: number) => {
        setRating(selectedRating);
    };

    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity key={i} onPress={() => handleStarPress(i * 2)} style={styles.starButton} disabled={loading}>
                    <Ionicons
                        name={i * 2 <= rating ? 'star' : 'star-outline'}
                        size={30}
                        color={i * 2 <= rating ? '#FFD700' : '#A0A0A0'}
                    />
                </TouchableOpacity>
            );
        }
        return <View style={styles.starsContainer}>{stars}</View>;
    };

    const handleSubmitComment = async () => {
        if (!commentText.trim()) {
            Alert.alert('Error', 'Por favor, escribe un comentario.');
            return;
        }
        if (rating === 0) {
            Alert.alert('Error', 'Por favor, selecciona una puntuación.');
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'Debes iniciar sesión.');
                setLoading(false);
                return;
            }

            const payload = {
                movieId: movieId,
                text: commentText,
                rating: rating,
            };

            let response;
            if (isEditing) {
                response = await axios.put(
                    `${API_URL}/comments/${commentId}`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                Alert.alert('Éxito', '¡Tu comentario ha sido actualizado!');
            } else {
                response = await axios.post(
                    `${API_URL}/comments`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                Alert.alert('Éxito', '¡Tu comentario ha sido enviado!');
            }

            if (response.status === 200 || response.status === 201) {
                navigation.goBack();
            } else {
                Alert.alert('Error', response.data?.message || 'Hubo un error al procesar tu comentario.');
            }
        } catch (error: any) {
            console.error('Error processing comment:', error.response?.data || error.message);
            Alert.alert('Error', error.response?.data?.message || 'No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    // Esta URI usará currentPosterPath, que es reactivo a los datos obtenidos en useEffect
    const fullPosterUri = currentPosterPath ? `https://image.tmdb.org/t/p/w200${currentPosterPath}` : 'https://via.placeholder.com/150/0A0A0A/FFFFFF?text=No+Poster'; // Fallback más descriptivo

    return (
        // El SafeAreaView es el contenedor principal y el que dictará los bordes seguros.
        // Asegúrate de que su color de fondo sea el que quieres para toda la pantalla.
        <SafeAreaView style={styles.safeArea}>
            {/* La StatusBar sigue siendo relevante para el estilo de la barra de estado */}
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

            {/* El header se manejará directamente como el primer hijo del SafeAreaView
                para que respete el borde superior sin doble padding */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton} disabled={loading}>
                    <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Comment' : 'Add Comment'}</Text>
                <TouchableOpacity onPress={handleSubmitComment} style={styles.headerButton} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Ionicons name="checkmark" size={28} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>

            {/* El contentContainer toma el resto del espacio.
                El padding para el borde inferior lo manejará automáticamente el SafeAreaView. */}
            <View style={styles.contentContainer}>
                <View style={styles.topSection}>
                    <View style={styles.movieInfoRow}>
                        <Text style={styles.movieTitleText}>{movieTitle} {currentMovieYear}</Text>
                        <Image source={{ uri: fullPosterUri }} style={styles.moviePoster} />
                    </View>

                    <View style={styles.ratingContainer}>
                        <Text style={styles.label}>Rate</Text>
                        {renderStars()}
                    </View>
                </View>

                <View style={styles.commentSection}>
                    <Text style={styles.label}>{isEditing ? 'Edit review...' : 'Add review...'}</Text>
                    <TextInput
                        style={styles.commentInput}
                        multiline
                        placeholder={isEditing ? "Edit your review here..." : "Write your review here..."}
                        placeholderTextColor="#A0A0A0"
                        value={commentText}
                        onChangeText={setCommentText}
                        textAlignVertical="top"
                        editable={!loading}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#1C1C1C',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: '#1C1C1C',
    },
    headerButton: {
        padding: 5,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    contentContainer: {
        flex: 1, // Hace que el contentContainer ocupe todo el espacio restante
        padding: 20,
        // Agrega un layout de columna para que las secciones se apilen y el TextInput crezca
        flexDirection: 'column',
    },
    topSection: {
        // Agrupa movieInfoRow y ratingContainer en una sección que no crezca
        marginBottom: 20, // Espacio entre esta sección y el TextInput
    },
    movieInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    movieTitleText: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
        flexShrink: 1, // Permite que el texto se encoja si es muy largo
        marginRight: 10,
    },
    moviePoster: {
        width: 80, // Aumentado ligeramente el tamaño para mejor visibilidad
        height: 120, // Mantener la proporción (80 * 1.5)
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#333',
    },
    ratingContainer: {
        marginBottom: 10, // Un poco menos de margen aquí, el margen grande lo pone topSection
    },
    starsContainer: {
        flexDirection: 'row',
        marginTop: 5,
    },
    starButton: {
        padding: 5,
    },
    label: {
        color: '#A0A0A0',
        fontSize: 16,
        marginBottom: 5,
    },
    commentSection: {
        flex: 1, // Hace que esta sección ocupe todo el espacio restante
        // No marginBottom aquí para que el input vaya hasta abajo
    },
    commentInput: {
        backgroundColor: '#222',
        color: '#FFF',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        // minHeight: 120, // Eliminamos minHeight para que flex: 1 tenga control total
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
        flex: 1, // Esto hace que el TextInput ocupe todo el espacio vertical disponible
    },
});

export default AddCommentScreen;