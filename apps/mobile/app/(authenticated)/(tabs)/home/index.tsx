import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { MOBILE_MODULES, MobileModule } from '../../../../lib/modules';
import { useAuthStore } from '../../../../stores/auth.store';
import { supabase } from '../../../../lib/supabase';

function ModuleItem({ module }: { module: MobileModule }) {
  const handlePress = () => {
    if (module.route) {
      router.navigate(module.route as any);
    } else {
      Alert.alert(module.title, 'Este módulo estará disponible próximamente.');
    }
  };

  const opacity = module.route ? 1 : 0.4;

  return (
    <TouchableOpacity
      style={styles.moduleItem}
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <View style={[styles.iconCircle, { backgroundColor: module.bgColor }]} opacity={opacity}>
        <Ionicons name={module.icon} size={26} color={module.iconColor} />
      </View>
      <Text style={[styles.moduleLabel, { opacity }]} numberOfLines={2}>
        {module.title}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MobileModule }) => <ModuleItem module={item} />,
    []
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Panadería</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={MOBILE_MODULES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={4}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    ...typography.title1,
    fontWeight: '800',
    color: colors.text,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  row: {
    paddingHorizontal: 12,
  },
  moduleItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  moduleLabel: {
    ...typography.caption1,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
});
