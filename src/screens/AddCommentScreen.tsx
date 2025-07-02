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

    // El rating ahora puede ser un número flotante (ej. 3.5)
    const [rating, setRating] = useState(initialRating || 0); 
    const [commentText, setCommentText] = useState(initialText || '');
    const [loading, setLoading] = useState(false);

    // Estados para movieYear y posterPath que pueden ser actualizados
    const [currentMovieYear, setCurrentMovieYear] = useState(movieYear || '');
    const [currentPosterPath, setCurrentPosterPath] = useState(posterPath || '');

    const isEditing = !!commentId;

    useEffect(() => {
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
    }, [movieId, currentMovieYear, currentPosterPath]);

    // --- MODIFICACIONES PARA MEDIAS ESTRELLAS ---

    // Función para manejar el toque de una estrella, permitiendo medias estrellas
     const handleStarPress = (tappedStarValue: number) => {
        console.log(`[DEBUG STAR PRESS] Tapped star value: ${tappedStarValue}, Current rating: ${rating}`);

        if (tappedStarValue === rating) {
            // Caso 1: Se toca una estrella que ya es el valor completo del rating.
            // Ejemplo: Rating es 3.0, se toca la 3ª estrella. Queremos que se vuelva 2.5.
            setRating(tappedStarValue - 0.5);
        } else if (tappedStarValue - 0.5 === rating) {
            // Caso 2: Se toca una estrella que es el valor de media estrella del rating.
            // Ejemplo: Rating es 2.5, se toca la 3ª estrella (que visualmente es media). Queremos que se vuelva 3.0.
            setRating(tappedStarValue);
        } else if (tappedStarValue < rating) {
            // Caso 3: Se toca una estrella con un valor menor al rating actual.
            // Esto implica que se quiere reducir el rating.
            // Ejemplo: Rating es 4.0, se toca la 2ª estrella. Queremos que el rating sea 2.0.
            setRating(tappedStarValue);
        } else { // tappedStarValue > rating (implica que se está aumentando el rating o tocando una estrella vacía)
            // Caso 4: Se toca una estrella vacía o una estrella con un valor mayor al rating actual.
            // Queremos que el rating sea el valor completo de la estrella tocada.
            // Ejemplo: Rating 2.0, se toca la 4ª estrella -> Rating 4.0.
            // Ejemplo: Rating 0.0, se toca la 1ª estrella -> Rating 1.0.
            setRating(tappedStarValue);
        }

        // Caso especial para el rating 0 (cuando no hay ninguna estrella seleccionada)
        if (tappedStarValue === 1 && rating === 0) {
            setRating(0.5); // Si no hay rating y se toca la primera, empieza con 0.5
        } else if (tappedStarValue === 0.5 && rating === 0.5) {
             setRating(0); // If it's half and tapped again, go to 0
        }

        // Asegurarse de que el rating mínimo sea 0.5 y máximo 5.
        // Y que no baje de 0 si se reduce la primera estrella por debajo de 0.5
        setRating(prevRating => Math.max(prevRating < 0.5 && tappedStarValue === 1 ? 0 : 0.5, Math.min(5, prevRating)));
    };

      const renderStars = () => {
    const stars = [];
    console.log('[DEBUG AddCommentScreen] Rating actual para renderizar:', rating); // AGREGAR ESTE LOG

    for (let i = 1; i <= 5; i++) {
        let iconName: 'star' | 'star-half' | 'star-outline';
        let iconColor: string;

        // Visual logic for the stars based on the 'rating' state
        if (rating >= i) {
            iconName = 'star';
            iconColor = '#FFD700';
        } else if (rating >= (i - 0.5)) { // Simplified condition: if rating is at least i-0.5
            iconName = 'star-half';
            iconColor = '#FFD700';
        } else {
            iconName = 'star-outline';
            iconColor = '#A0A0A0';
        }

        stars.push(
            <TouchableOpacity
                key={i}
                onPress={() => handleStarPress(i)}
                onLongPress={() => handleStarPress(i - 0.5)}
                delayLongPress={200}
                style={styles.starButton} // Usamos un estilo único y genérico
                disabled={loading}
            >
                <Ionicons
                    name={iconName}
                    size={30}
                    color={iconColor}
                />
            </TouchableOpacity>
        );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
};


    // --- FIN DE MODIFICACIONES PARA MEDIAS ESTRELLAS ---

    const handleSubmitComment = async () => {
        if (!commentText.trim()) {
            Alert.alert('Error', 'Por favor, escribe un comentario.');
            return;
        }
        // Valida que el rating esté en el rango 1 a 5 y sea un número válido.
        if (rating === 0 || rating < 0.5 || rating > 5 || isNaN(rating)) {
            Alert.alert('Error', 'Por favor, selecciona una puntuación válida entre 0.5 y 5 estrellas.');
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
                rating: rating, // Ya está en el formato 1-5, incluso con decimales
            };

            console.log('[DEBUG SUBMIT] Payload to be sent:', payload);

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

    const fullPosterUri = currentPosterPath ? `https://image.tmdb.org/t/p/w200${currentPosterPath}` : 'https://via.placeholder.com/150/0A0A0A/FFFFFF?text=No+Poster';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

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
        flex: 1,
        padding: 20,
        flexDirection: 'column',
    },
    topSection: {
        marginBottom: 20,
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
        flexShrink: 1,
        marginRight: 10,
    },
    moviePoster: {
        width: 80,
        height: 120,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#333',
    },
    ratingContainer: {
        marginBottom: 10,
    },
    starsContainer: {
        flexDirection: 'row',
        marginTop: 5,
    },
    // Nuevos estilos para los botones de media estrella
    starButtonHalf: {
        padding: 5,
        marginRight: -15, // Solapa ligeramente para que las mitades se vean conectadas
    },
    starButtonFull: {
        padding: 5,
    },
    starButton: { // Mantener si otras partes lo usan, pero los nuevos ya tienen sus propios estilos
        padding: 5,
    },
    label: {
        color: '#A0A0A0',
        fontSize: 16,
        marginBottom: 5,
    },
    commentSection: {
        flex: 1,
    },
    commentInput: {
        backgroundColor: '#222',
        color: '#FFF',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
        flex: 1,
    },
});

export default AddCommentScreen;