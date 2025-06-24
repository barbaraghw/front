import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // Importar Bottom Tab
import { Ionicons } from '@expo/vector-icons'; 
import { ActivityIndicator, View, Text } from 'react-native'; 
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MovieListScreen from './src/screens/MovieListScreen'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import AccountScreen from './src/screens/AccountScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: {
    screen?: keyof BottomTabParamList; // Opcional, para especificar la pestaña inicial
    params?: BottomTabParamList[keyof BottomTabParamList]; // Opcional, para pasar parámetros a la pestaña
  } | undefined; // Permite que MainTabs también pueda ser llamado sin parámetros
};

export type BottomTabParamList = {
  Movies: undefined; // Pestaña de películas
  Account: undefined; // Pestaña de cuenta
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap; // Variable declaration

          if (route.name === 'Movies') {
            iconName = focused ? 'film' : 'film-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle-outline'; // A default icon, e.g., question mark
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1E3A8A', // Color de pestaña activa
        tabBarInactiveTintColor: 'gray', // Color de pestaña inactiva
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingBottom: 5,
          height: 60, // Altura de la barra
        },
        tabBarLabelStyle: {
          fontSize: 12,
        }
      })}
    >
      <Tab.Screen name="Movies" component={MovieListScreen} options={{ title: 'Películas' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Cuenta' }} />
    </Tab.Navigator>
  );
}

// =========================================================
// Componente principal de la aplicación
// =========================================================
const App = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (userToken) {
          // Si hay token, navegamos a las pestañas principales
          setInitialRoute('MainTabs');
        } else {
          // Si no hay token, a la pantalla de Login
          setInitialRoute('Login');
        }
      } catch (e) {
        console.error('Tu sesion ha expirado', e);
        setInitialRoute('Login'); // En caso de error, ir a Login
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  if (isLoading) {
    // Puedes renderizar una pantalla de carga aquí
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {/* Pantallas que no están dentro de las pestañas */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        {/* La pantalla que contiene el Bottom Tab Navigator */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;