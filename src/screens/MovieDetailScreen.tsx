// src/screens/MovieDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    StatusBar
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Define DetailedMovie interface - KEEP THIS AS IS, assuming backend will match
interface DetailedMovie {
    _id: string;
    title: string;
    overview: string;
    release_date: string;
    vote_average: number;
    poster_path: string; // This is now expected to be a full URL
    backdrop_path: string; // This is now expected to be a full URL
    genres: { id: number; name: string }[]; // Array of genre objects with name
    runtime: number; // In minutes
}

type MovieDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'MovieDetail'>;

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MovieDetailScreen: React.FC<MovieDetailScreenProps> = ({ navigation, route }) => {
    const { movieId, movieTitle } = route.params;
    const [movie, setMovie] = useState<DetailedMovie | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMovieDetail = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión.');
                navigation.navigate('Login');
                return;
            }

            const response = await axios.get<DetailedMovie>(`${API_URL}/movies/${movieId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMovie(response.data);

            console.log('Datos de la película recibidos:', response.data);
            console.log('Géneros:', response.data.genres);
            console.log('Duración (runtime):', response.data.runtime);
            console.log('Poster Path:', response.data.poster_path);
            console.log('Backdrop Path:', response.data.backdrop_path);

        } catch (err) {
            const axiosError = err as any;
            const errorMessage = axiosError.response?.data?.message || 'Error al cargar los detalles de la película.';
            setError(errorMessage);
            Alert.alert('Error', errorMessage);
            console.error('Error fetching movie details:', axiosError.response?.data || axiosError.message);
        } finally {
            setLoading(false);
        }
    }, [movieId, navigation]);

    useEffect(() => {
        if (movieId) {
            fetchMovieDetail();
        }
    }, [movieId, fetchMovieDetail]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Cargando detalles...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchMovieDetail}>
                    <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButtonBottom} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!movie) {
        return (
            <View style={styles.centered}>
                <Text>No se encontraron datos de la película.</Text>
            </View>
        );
    }

    // --- CÓDIGO PARA MOSTRAR LOS DATOS ---
    // NO NECESITAS imageBaseUrl ni posterSize/backdropSize si el backend envía URL completas
    // PERO, si el backend envía paths relativos (ej. "/kyBOGOBUMdGWOhzECuosPSzoMpi.jpg"), ENTONCES SÍ NECESITAS CONCATENAR
    // Basado en tu LOG, el backend envía URLs completas, así que simplemente las usamos directamente.
    // Si quieres más calidad en backdrop, el backend debería enviar el path con 'original' o tú lo concatenas aquí
    // asumiendo que el backend envía 'w500' y tú quieres 'original' para backdrop.

    // Ajuste para URLs de imagen: usar las URLs tal cual si vienen completas,
    // o concatenar si vienen como paths relativos.
    // Basado en tu LOG, vienen completas:
    const finalPosterUrl = movie.poster_path;
    const finalBackdropUrl = movie.backdrop_path; // Si tu backend ya envió w500, para original, necesitarías el path sin el w500
    
    // **Si quieres forzar 'original' en el frontend, y tu backend está dando 'w500' en el path:**
    // Necesitas extraer el path de la URL recibida.
    // Ejemplo:
    // const backdropPathFromUrl = movie.backdrop_path.split('w500')[1]; // Esto tomaría "/kyBOGOBUMdGWOhzECuosPSzoMpi.jpg"
    // const finalBackdropUrl = `https://image.tmdb.org/t/p/original${backdropPathFromUrl}`;
    // Pero es más robusto que el backend te envíe el path relativo o una URL de "original" directamente.
    // Por ahora, asumamos que las URLs del backend son las que queremos usar.

    // --- CORRECCIÓN CLAVE PARA GÉNEROS Y KEY PROP ---
    // Si el backend envía [28, 27, 878] y no objetos {id, name}, esta parte NO FUNCIONARÁ como esperas.
    // La interfaz DetailedMovie asume {id, name}.
    // O bien corriges el backend para que envíe el formato correcto para 'genres',
    // O bien cambias la interfaz DetailedMovie en el frontend a `genres: number[];`
    // y luego haces un mapeo local de IDs a nombres de género (como en el ejemplo de la respuesta anterior).

    // **Asumiendo que el backend enviará { id: number; name: string }[] para `genres` en el futuro:**
    const renderGenres = () => {
        if (!movie.genres || movie.genres.length === 0) {
            return <Text style={styles.genreText}>Géneros no disponibles</Text>;
        }
        return movie.genres.map((genre) => (
            <View key={genre.id} style={styles.genrePill}>
                <Text style={styles.genreText}>{genre.name}</Text>
            </View>
        ));
    };

    // **Si el backend SIGUE ENVIANDO `[28, 27, 878]` (solo IDs):**
    // DEBES DESCOMENTAR Y USAR ESTA LÓGICA Y CAMBIAR `DetailedMovie` a `genres: number[];`
    /*
    const genreMap: { [key: number]: string } = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
        99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
        27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
        10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    };
    const renderGenres = () => {
        if (!movie.genres || movie.genres.length === 0) {
            return <Text style={styles.genreText}>Géneros no disponibles</Text>;
        }
        return movie.genres.map((genreId) => (
            <View key={genreId} style={styles.genrePill}>
                <Text style={styles.genreText}>{genreMap[genreId] || `ID: ${genreId}`}</Text>
            </View>
        ));
    };
    */

    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    const runtimeText = movie.runtime > 0 ? `${hours}h ${minutes}min` : 'N/A'; // Will show N/A if runtime is undefined/0

    const renderStars = (rating: number) => {
        const fullStars = Math.floor(rating / 2);
        const halfStar = rating % 2 >= 1;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        const stars = [];

        for (let i = 0; i < fullStars; i++) {
            stars.push(<Ionicons key={`full-${i}`} name="star" size={20} color="#FFD700" />);
        }
        if (halfStar) {
            stars.push(<Ionicons key="half" name="star-half" size={20} color="#FFD700" />);
        }
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={20} color="#A0A0A0" />);
        }
        return <View style={styles.starsContainer}>{stars}</View>;
    };

    return (
        <View style={styles.fullScreenContainer}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ScrollView style={styles.scrollViewContent}>
                {/* Backdrop Image */}
                <View style={styles.backdropContainer}>
                    <Image
                        source={{ uri: finalBackdropUrl }} // Use the final calculated URL
                        style={styles.backdropImage}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
                        style={styles.gradientOverlay}
                    />
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={30} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.movieTitle}>{movie.title}</Text>
                </View>

                <View style={styles.contentContainer}>
                    {/* Genres */}
                    <View style={styles.genresContainer}>
                        {renderGenres()} {/* Use the helper function here */}
                    </View>

                    {/* Comment and View Comments Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity style={styles.commentButton} onPress={() => Alert.alert('Comentar', 'Funcionalidad de comentarios no implementada aún.')}>
                            <Text style={styles.commentButtonText}>comentar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.viewCommentsButton} onPress={() => Alert.alert('Ver Comentarios', 'Funcionalidad de ver comentarios no implementada aún.')}>
                            <Text style={styles.viewCommentsButtonText}>ver comentarios</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Release Year, Rating, Runtime */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoText}>{releaseYear}</Text>
                        <Text style={styles.infoSeparator}>|</Text>
                        {renderStars(movie.vote_average)}
                        <Text style={styles.infoSeparator}>|</Text>
                        <Text style={styles.infoText}>{runtimeText}</Text>
                    </View>

                    {/* Storyline */}
                    <Text style={styles.storylineTitle}>Storyline</Text>
                    <Text style={styles.storylineText}>{movie.overview}</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    scrollViewContent: {
        flexGrow: 1,
    },
    backdropContainer: {
        width: screenWidth,
        height: screenWidth * 1.2,
        justifyContent: 'flex-end',
        position: 'relative',
    },
    backdropImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '60%',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 5,
    },
    movieTitle: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        color: '#FFF',
        fontSize: 34,
        fontWeight: 'bold',
        textAlign: 'left',
        zIndex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        backgroundColor: '#0A0A0A',
        marginTop: -50,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    genresContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
        marginTop: 10,
    },
    genrePill: {
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 12,
        marginRight: 10,
        marginBottom: 10,
    },
    genreText: {
        color: '#A0A0A0',
        fontSize: 14,
        fontWeight: '500',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    commentButton: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#FFF',
        borderRadius: 10,
        paddingVertical: 12,
        marginRight: 10,
        alignItems: 'center',
    },
    commentButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    viewCommentsButton: {
        flex: 1,
        backgroundColor: '#4A90E2',
        borderRadius: 10,
        paddingVertical: 12,
        marginLeft: 10,
        alignItems: 'center',
    },
    viewCommentsButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    infoText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    infoSeparator: {
        color: '#A0A0A0',
        marginHorizontal: 10,
        fontSize: 16,
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 10,
    },
    storylineTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    storylineText: {
        color: '#E0E0E0',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
    },
    loadingText: {
        color: '#FFF',
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
        padding: 20,
    },
    errorText: {
        color: '#FF6347',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#E50914',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        marginBottom: 10,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButtonBottom: {
        backgroundColor: '#333',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    // ADDED `centered` style
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
    },
});

export default MovieDetailScreen;