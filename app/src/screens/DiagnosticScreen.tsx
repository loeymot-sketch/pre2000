import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, getCountFromServer, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { theme } from '../theme';
import { useScreenAnalytics } from '../hooks/useScreenAnalytics';

interface CollectionStats {
    name: string;
    count: number;
    status: 'ok' | 'warning' | 'error';
    details?: string;
}

export const DiagnosticScreen = () => {
    useScreenAnalytics('DiagnosticScreen');
    const [stats, setStats] = useState<CollectionStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runDiagnostic = async () => {
        setLoading(true);
        setStats([]);
        setLogs([]);
        addLog('Starting diagnostic...');

        const collections = [
            { name: 'weeks', expected: 40 },
            { name: 'articles', expected: 20 },
            { name: 'supplements', expected: 15 },
            { name: 'calendarTemplates', expected: 15 }, // Range 15-25
            { name: 'redFlags', expected: 15 },
            { name: 'chatbotSuggestions', expected: 20 }, // Range 20-30
            { name: 'babyMessages', expected: 30 }, // Critical for Home Screen
            { name: 'tips', expected: 30 }, // Critical for Home Screen
        ];

        const newStats: CollectionStats[] = [];

        for (const col of collections) {
            try {
                addLog(`Checking ${col.name}...`);
                const collRef = collection(db, col.name);
                const snapshot = await getCountFromServer(collRef);
                const count = snapshot.data().count;

                let status: 'ok' | 'warning' | 'error' = 'ok';
                let details = '';

                if (count === 0) {
                    status = 'error';
                    details = 'Collection is empty!';
                } else if (count < col.expected) {
                    status = 'warning';
                    details = `Expected ~${col.expected}, found ${count}`;
                }

                // Deep check for articles
                if (col.name === 'articles' && count > 0) {
                    addLog('Verifying article content...');
                    const q = query(collRef, limit(5));
                    const docs = await getDocs(q);
                    let emptyContentCount = 0;
                    docs.forEach(d => {
                        const data = d.data();
                        if (!data.content_markdown_fr || data.content_markdown_fr.length < 50) {
                            emptyContentCount++;
                            addLog(`⚠️ Article ${d.id} has empty/short content`);
                        }
                    });

                    if (emptyContentCount > 0) {
                        status = 'warning';
                        details += ` | ${emptyContentCount}/5 checked articles have empty content`;
                    } else {
                        details += ' | Content check passed';
                    }
                }

                newStats.push({ name: col.name, count, status, details });
                addLog(`✅ ${col.name}: ${count} docs`);

            } catch (error: any) {
                addLog(`❌ Error checking ${col.name}: ${error.message}`);
                newStats.push({ name: col.name, count: -1, status: 'error', details: error.message });
            }
        }

        setStats(newStats);
        setLoading(false);
        addLog('Diagnostic complete.');
    };

    useEffect(() => {
        runDiagnostic();
    }, []);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={theme.typography.h1}>Diagnostic Data</Text>
                <TouchableOpacity style={styles.button} onPress={runDiagnostic} disabled={loading}>
                    <Text style={styles.buttonText}>{loading ? 'Checking...' : 'Re-run Check'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                {stats.map((stat) => (
                    <View key={stat.name} style={[styles.statCard, styles[`status_${stat.status}`]]}>
                        <View style={styles.statHeader}>
                            <Text style={styles.statName}>{stat.name}</Text>
                            <Text style={styles.statCount}>{stat.count === -1 ? 'Err' : stat.count}</Text>
                        </View>
                        {stat.details ? <Text style={styles.statDetails}>{stat.details}</Text> : null}
                    </View>
                ))}
            </View>

            <View style={styles.logsContainer}>
                <Text style={theme.typography.h3}>Logs</Text>
                {logs.map((log, i) => (
                    <Text key={i} style={styles.logText}>{log}</Text>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
    },
    header: {
        marginBottom: theme.spacing.l,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.s,
        borderRadius: theme.borderRadius.s,
    },
    buttonText: {
        color: theme.colors.white,
        fontWeight: 'bold',
    },
    statsContainer: {
        gap: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    statCard: {
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
    },
    status_ok: {
        backgroundColor: '#E8F5E9',
        borderColor: theme.colors.success,
    },
    status_warning: {
        backgroundColor: '#FFF3E0',
        borderColor: theme.colors.warning,
    },
    status_error: {
        backgroundColor: '#FFEBEE',
        borderColor: theme.colors.error,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statCount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statDetails: {
        marginTop: theme.spacing.xs,
        fontSize: 14,
        color: theme.colors.textLight,
    },
    logsContainer: {
        backgroundColor: '#263238',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.xl,
    },
    logText: {
        color: '#CFD8DC',
        fontFamily: 'monospace',
        fontSize: 12,
        marginBottom: 4,
    },
});
