import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Ingresa tu email y contraseña');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert('Error', error.message);
      setIsLoading(false);
      return;
    }
    router.replace('/');
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Panadería</Text>
            <Text style={styles.subtitle}>Gestión de Pedidos</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.inputSeparator} />

            <View style={styles.inputRow}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    ...typography.largeTitle,
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  formCard: {
    backgroundColor: colors.secondarySystemGroupedBackground,
    borderRadius: 10,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 16,
  },
  label: {
    ...typography.body,
    color: colors.text,
    width: 100,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
    textAlign: 'right',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
});
