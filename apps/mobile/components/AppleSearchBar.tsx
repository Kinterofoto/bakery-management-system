import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface AppleSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export function AppleSearchBar({ value, onChangeText, placeholder = 'Search' }: AppleSearchBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={colors.textTertiary} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textTertiary}
                    clearButtonMode="while-editing"
                    autoCorrect={false}
                />
                {value.length > 0 && Platform.OS === 'android' && (
                    <TouchableOpacity onPress={() => onChangeText('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Platform.OS === 'ios' ? '#E3E3E8' : '#F0F0F0',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 38,
    },
    icon: {
        marginRight: 6,
    },
    input: {
        flex: 1,
        ...typography.body,
        fontSize: 17,
        color: colors.text,
        paddingVertical: 0,
        height: '100%',
    },
});
