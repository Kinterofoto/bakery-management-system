import React from 'react';
import { View, TextInput, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface UberSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export function UberSearchBar({ value, onChangeText, placeholder = 'Search' }: UberSearchBarProps) {
    return (
        <View style={styles.outerContainer}>
            <View style={styles.container}>
                <Ionicons name="search" size={20} color={colors.text} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSecondary}
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                />
                {value.length > 0 && Platform.OS === 'android' && (
                    <TouchableOpacity onPress={() => onChangeText('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEEEEE',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 52,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        ...typography.title3,
        fontSize: 18,
        color: colors.text,
        paddingVertical: 0,
        height: '100%',
    },
});
