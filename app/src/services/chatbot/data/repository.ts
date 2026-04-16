import { Article, RedFlag, ChatbotSuggestion } from '../../../types';

export interface ChatbotRepository {
    getArticles(): Promise<Article[]>;
    getRedFlags(): Promise<RedFlag[]>;
    getSuggestions(): Promise<ChatbotSuggestion[]>;
}
