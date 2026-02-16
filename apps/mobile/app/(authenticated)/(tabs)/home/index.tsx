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

function ModuleCard({ module }: { module: MobileModule }) {
  const handlePress = () => {
    if (module.route) {
      router.navigate(module.route as any);
    } else {
      Alert.alert(module.title, 'Este módulo estará disponible próximamente.');
    }
  };

  return (
    <TouchableOpacity
      style={styles.moduleCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.moduleIcon, { backgroundColor: module.bgColor }]}>
        <Ionicons name={module.icon} size={28} color={module.iconColor} />
      </View>
      <Text style={styles.moduleTitle} numberOfLines={1}>
        {module.title}
      </Text>
      <Text style={styles.moduleDescription} numberOfLines={2}>
        {module.description}
      </Text>
      {!module.route && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Pronto</Text>
        </View>
      )}
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
    ({ item }: { item: MobileModule }) => <ModuleCard module={item} />,
    []
  );

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.email?.split('@')[0] ?? 'Usuario'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={MOBILE_MODULES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Módulos</Text>
        }
      />
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.title1,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.headline,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  grid: {
    paddingBottom: 40,
  },
  row: {
    paddingHorizontal: 16,
    gap: 12,
  },
  moduleCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleTitle: {
    ...typography.headline,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  moduleDescription: {
    ...typography.caption1,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  comingSoonText: {
    ...typography.caption2,
    fontWeight: '600',
    color: colors.textTertiary,
  },
});
