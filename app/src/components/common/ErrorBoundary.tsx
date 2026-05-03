import { createLogger } from '../../utils/logger';
const log = createLogger('ErrorBoundary');
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { getShadowStyle } from '../../utils/styleUtils';
import * as Sentry from '@sentry/react-native';
import i18n from '../../i18n';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        log.error('Uncaught error:', error, errorInfo);
        // Send error to Sentry in production
        if (!__DEV__) {
            Sentry.captureException(error, {
                extra: { componentStack: errorInfo.componentStack },
            });
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.emoji}>🙈</Text>
                        <Text style={styles.title}>{i18n.t('errorBoundary.title')}</Text>
                        <Text style={styles.message}>
                            {i18n.t('errorBoundary.message')}
                        </Text>

                        {this.state.error && (
                            <ScrollView style={styles.errorBox}>
                                <Text style={styles.errorText}>
                                    {this.state.error.toString()}
                                </Text>
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={styles.button}
                            onPress={this.handleRetry}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>{i18n.t('errorBoundary.retry')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.neutral900,
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    errorBox: {
        maxHeight: 150,
        width: '100%',
        backgroundColor: theme.colors.neutral100,
        padding: 12,
        borderRadius: 8,
        marginBottom: 32,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.red600,
        fontFamily: 'Courier',
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        ...getShadowStyle(4, theme.colors.primary, 0.3, 8, { width: 0, height: 4 }),
    },
    buttonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
});
