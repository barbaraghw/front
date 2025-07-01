// src/screens/CommentsScreen.tsx
import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView, // Ya importado
    StatusBar,
    ScrollView,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import CommentSection from '../components/CommentSection';
import { useFocusEffect } from '@react-navigation/native';

interface DecodedToken {
    id: string;
    email: string;
    username: string;
    exp: number;
}

type CommentsScreenProps = NativeStackScreenProps<RootStackParamList, 'Comments'>;

const CommentsScreen: React.FC<CommentsScreenProps> = ({ route, navigation }) => {
    const { movieId, movieTitle } = route.params;
    const [currentUserAuthId, setCurrentUserAuthId] = React.useState<string | null>(null);

    const commentsSectionRef = useRef<View>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    useFocusEffect(
        React.useCallback(() => {
            const fetchUserId = async () => {
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                    try {
                        const decoded = jwtDecode<DecodedToken>(token);
                        setCurrentUserAuthId(decoded.id);
                    } catch (decodeError) {
                        console.error('Error decoding JWT token in CommentsScreen:', decodeError);
                        setCurrentUserAuthId(null);
                    }
                } else {
                    setCurrentUserAuthId(null);
                }
            };
            fetchUserId();
        }, [])
    );

    const handleEditComment = (commentId: string, initialText: string, initialRating: number) => {
        navigation.navigate('AddComment', {
            movieId: movieId,
            movieTitle: movieTitle,
            movieYear: '', // Considerar pasar movieYear y posterPath desde MovieDetailScreen
            posterPath: '', // para evitar la búsqueda adicional en AddCommentScreen
            commentId: commentId,
            initialText: initialText,
            initialRating: initialRating,
        });
    };

    return (
        // Mantén el SafeAreaView como contenedor principal y dale el color de fondo.
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

            {/* El encabezado se manejará por separado dentro del SafeAreaView,
                o se le dará padding si está dentro del ScrollView.
                Para asegurar que el header SIEMPRE esté en la parte superior y respete la barra,
                es mejor sacarlo del ScrollView y dejar el ScrollView debajo. */}
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Comments for {movieTitle}</Text>
                <TouchableOpacity style={styles.filterButton}>
                    <Ionicons name="funnel" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* El ScrollView ahora ocupa el espacio restante debajo del header y dentro del safeArea. */}
            <ScrollView style={styles.scrollViewContent} ref={scrollViewRef}>
                <View ref={commentsSectionRef} collapsable={false}>
                    <CommentSection
                        movieId={movieId}
                        movieTitle={movieTitle}
                        currentUserAuthId={currentUserAuthId}
                        onEditComment={handleEditComment}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0A0A0A', // El color de fondo para toda la safeArea
    },
    // El 'container' anterior se ha dividido. customHeader ahora es independiente.
    // scrollViewContent se encarga del contenido scrollable.
    scrollViewContent: {
        flex: 1, // Hace que el ScrollView ocupe todo el espacio restante
        backgroundColor: '#0A0A0A', // Color de fondo del contenido scrollable
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        // paddingVertical se encarga del espacio, no se necesita paddingTop específico para StatusBar aquí
        paddingVertical: 15,
        backgroundColor: '#1C1C1C',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        // Asegúrate de que este header se renderiza ANTES del ScrollView
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    filterButton: {
        padding: 5,
    },
});

export default CommentsScreen;