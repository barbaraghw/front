// App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Text, Platform, SafeAreaView } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
// --- VERIFY THESE IMPORTS ---
// Your MovieListScreen is now your "Home" equivalent
import MovieListScreen from './src/screens/MovieListScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import AccountScreen from './src/screens/AccountScreen';
import CommentsScreen from './src/screens/CommentScreen'; // Screen to VIEW all comments
import AddCommentScreen from './src/screens/AddCommentScreen';
// ----------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    BottomTabs: undefined;
    MainTabs: {
        screen?: keyof BottomTabParamList;
        params?: BottomTabParamList[keyof BottomTabParamList];
    } | undefined;
    MovieDetail: { movieId: string; movieTitle: string };
    SearchScreen: undefined;
    // --- CAMBIO: Actualizar el tipo para MovieList ---
    MovieList: { type?: 'latest' | 'popular' | 'category' | 'genre' | 'all'; category?: string; genreId?: number; sortBy?: 'release_date' | 'vote_average' | 'title'; sortOrder?: 'desc' | 'asc' };
    Comments: { movieId: string; movieTitle: string }; // For viewing all comments

    AddComment: {
    movieId: string;
    movieTitle: string;
    movieYear: string;
    posterPath?: string;
    // Optional properties for editing an existing comment
    commentId?: string; // ID of the comment to edit
    initialText?: string; // Current text of the comment
    initialRating?: number; // Current rating of the comment
  };
};
export type BottomTabParamList = {
    // ONLY ONE PRIMARY MOVIE TAB: 'Movies'
    Movies: undefined; // This tab will render your MovieListScreen (your Home equivalent)
    Account: undefined; // Pestaña de cuenta
    // Add any other tabs here
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    if (route.name === 'Movies') { // This is your primary movie tab
                        iconName = focused ? 'film' : 'film-outline'; // Or 'home' if you prefer a home icon for your main movie list
                    } else if (route.name === 'Account') {
                        iconName = focused ? 'person' : 'person-outline';
                    } else {
                        iconName = 'help-circle-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#E50914',
                tabBarInactiveTintColor: '#A0A0A0',
                tabBarStyle: {
                    backgroundColor: '#1C1C1C',
                    borderTopWidth: 0,
                    paddingBottom: 5,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                }
            })}
        >
            {/* Your MovieListScreen is now assigned to the 'Movies' tab */}
            <Tab.Screen name="Movies" component={MovieListScreen} options={{ title: 'Películas' }} />
            <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Cuenta' }} />
        </Tab.Navigator>
    );
}

const App = () => {
    const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkToken = async () => {
            try {
                const userToken = await AsyncStorage.getItem('userToken');
                if (userToken) {
                    setInitialRoute('MainTabs');
                } else {
                    setInitialRoute('Login');
                }
            } catch (e) {
                console.error('Error checking token or session expired:', e);
                setInitialRoute('Login');
            } finally {
                setIsLoading(false);
            }
        };
        checkToken();
        if (Platform.OS === 'android') {
            // Set the navigation bar color to match your app's background
            NavigationBar.setBackgroundColorAsync('#0A0A0A');// <--- Changed SystemUI to NavigationBar
            // You might also want to hide it in some cases or change its behavior
            // NavigationBar.setNativeNavigationBarVisibilityAsync(NavigationBar.NavigationBarVisibility.HIDDEN); // Example for hiding
        }
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' }}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={{ color: '#FFF', marginTop: 10 }}>Cargando...</Text>
            </View>
        );
    }

    


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
        <NavigationContainer>
            <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />

                {/* The screen that contains the Bottom Tab Navigator */}
                <Stack.Screen name="MainTabs" component={MainTabs} />

                {/* MovieDetail and SearchScreen are still in the RootStack */}
                <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
                <Stack.Screen name="SearchScreen" component={SearchScreen} />
                {/* MovieList IS your MovieListScreen component. It's added here
                    so that you can navigate to it with specific parameters
                    from "See all" buttons on your tab, allowing it to potentially
                    display a filtered list or show its original filter UI if desired.
                    This MovieList route is separate from the 'Movies' tab.
                */}
                <Stack.Screen name="MovieList" component={MovieListScreen} />
                <Stack.Screen name="Comments" component={CommentsScreen} />
                <Stack.Screen name="AddComment" component={AddCommentScreen} />
            </Stack.Navigator>
        </NavigationContainer>
        </SafeAreaView>
    );
};

export default App;