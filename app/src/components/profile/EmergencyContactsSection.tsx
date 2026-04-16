import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Linking, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePregnancy, EmergencyContact } from '../../context/PregnancyContext';
import { createLogger } from '../../utils/logger';

const log = createLogger('EmergencyContactsSection');

export const EmergencyContactsSection = () => {
    const { t } = useTranslation();
    const { profile, setProfile } = usePregnancy();
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [newNumber, setNewNumber] = useState('');
    const [newType, setNewType] = useState<EmergencyContact['type']>('partner');

    const contacts = profile?.emergencyContacts || [];

    const handleCall = (number: string) => {
        const url = `tel:${number}`;
        Linking.canOpenURL(url)
            .then(supported => {
                if (!supported) {
                    Alert.alert(t('common.error'), t('emergency.callError'));
                } else {
                    return Linking.openURL(url);
                }
            })
            .catch(err => log.error('An error occurred', err));
    };

    const handleAdd = async () => {
        if (!newName.trim() || !newNumber.trim()) {
            Alert.alert(t('common.error'), t('emergency.validationError'));
            return;
        }

        const newContact: EmergencyContact = {
            id: Date.now().toString(),
            name: newName.trim(),
            number: newNumber.trim(),
            type: newType
        };

        const updatedContacts = [...contacts, newContact];

        try {
            await setProfile({
                ...profile!,
                emergencyContacts: updatedContacts
            });
            setIsAdding(false);
            setNewName('');
            setNewNumber('');
            setNewType('partner');
            log.info('Contact added');
        } catch (error) {
            log.error('Error adding contact', error);
            Alert.alert(t('common.error'), t('emergency.addError'));
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            t('emergency.deleteConfirm'),
            "",
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const updatedContacts = contacts.filter(c => c.id !== id);
                            await setProfile({
                                ...profile!,
                                emergencyContacts: updatedContacts
                            });
                        } catch (error) {
                            log.error('Error deleting contact', error);
                        }
                    }
                }
            ]
        );
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'partner': return t('emergency.types.partner');
            case 'doctor': return t('emergency.types.doctor');
            case 'sos': return t('emergency.types.sos');
            default: return t('emergency.types.other');
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'sos': return '#F44336'; // Red
            case 'doctor': return '#2196F3'; // Blue
            case 'partner': return '#E91E63'; // Pink
            default: return '#9E9E9E'; // Grey
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🆘 {t('emergency.title')}</Text>
                {!isAdding && (
                    <TouchableOpacity onPress={() => setIsAdding(true)} style={styles.addButton}>
                        <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            {contacts.length === 0 && !isAdding ? (
                <Text style={styles.emptyText}>{t('emergency.empty')}</Text>
            ) : (
                contacts.map(contact => (
                    <View key={contact.id} style={styles.contactRow}>
                        <View style={styles.contactInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(contact.type) }]}>
                                    <Text style={styles.typeText}>{getTypeLabel(contact.type)}</Text>
                                </View>
                                <Text style={styles.contactName}>{contact.name}</Text>
                            </View>
                            <Text style={styles.contactNumber}>{contact.number}</Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                onPress={() => handleCall(contact.number)}
                                style={[styles.actionButton, styles.callButton]}
                            >
                                <Text style={styles.actionIcon}>📞</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleDelete(contact.id)}
                                style={[styles.actionButton, styles.deleteButton]}
                            >
                                <Text style={styles.actionIcon}>🗑️</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}

            {/* Add Form */}
            {isAdding && (
                <View style={styles.addForm}>
                    <Text style={styles.formTitle}>{t('emergency.add')}</Text>

                    <View style={styles.typeSelector}>
                        {(['partner', 'doctor', 'sos', 'other'] as const).map(type => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => setNewType(type)}
                                style={[
                                    styles.typeButton,
                                    newType === type && { backgroundColor: getTypeColor(type), borderColor: getTypeColor(type) }
                                ]}
                            >
                                <Text style={[
                                    styles.typeButtonText,
                                    newType === type && { color: '#FFF' }
                                ]}>
                                    {getTypeLabel(type)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder={t('emergency.name')}
                        value={newName}
                        onChangeText={setNewName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={t('emergency.phone')}
                        value={newNumber}
                        onChangeText={setNewNumber}
                        keyboardType="phone-pad"
                    />

                    <View style={styles.formActions}>
                        <TouchableOpacity
                            onPress={() => setIsAdding(false)}
                            style={[styles.formButton, styles.cancelFormButton]}
                        >
                            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleAdd}
                            style={[styles.formButton, styles.addFormButton]}
                        >
                            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D32F2F',
    },
    addButton: {
        backgroundColor: '#FFEBEE',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        fontSize: 20,
        color: '#D32F2F',
        fontWeight: 'bold',
        marginTop: -2,
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 8,
    },
    contactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    contactNumber: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callButton: {
        backgroundColor: '#E8F5E9',
    },
    deleteButton: {
        backgroundColor: '#FFEBEE',
    },
    actionIcon: {
        fontSize: 16,
    },
    addForm: {
        marginTop: 8,
        padding: 12,
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    formTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    typeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    typeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
    },
    typeButtonText: {
        fontSize: 12,
        color: '#666',
    },
    formActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    formButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelFormButton: {
        backgroundColor: '#F5F5F5',
    },
    addFormButton: {
        backgroundColor: '#D32F2F',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
});
