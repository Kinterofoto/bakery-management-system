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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      Alert.alert('Error', 'Credenciales incorrectas');
    }
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.uberTitle}>Accede a tu cuenta</Text>
            <Text style={styles.uberSubtitle}>Ingresa tus credenciales para gestionar los pedidos de la panadería</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email o número de teléfono"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.mainButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Siguiente</Text>
                  <Text style={styles.arrow}>→</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>¿Has olvidado la contraseña?</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Al continuar, aceptas que Panadería o sus representantes pueden ponerse en contacto contigo.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
  },
  uberTitle: {
    ...typography.largeTitle,
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  uberSubtitle: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 22,
    color: '#545454',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: '#F6F6F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  input: {
    ...typography.body,
    fontSize: 18,
    color: '#000000',
    paddingVertical: 0,
  },
  mainButton: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    ...typography.headline,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  arrow: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    backgroundColor: '#AFAFAF',
  },
  forgotBtn: {
    marginTop: 12,
  },
  forgotText: {
    ...typography.subhead,
    color: '#000000',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  footerText: {
    ...typography.caption1,
    fontSize: 13,
    color: '#AFAFAF',
    lineHeight: 18,
  },
});
