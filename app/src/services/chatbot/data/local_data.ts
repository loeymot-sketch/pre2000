import { ChatbotRepository } from './repository';
import { ARTICLES, RED_FLAGS, SUGGESTIONS } from '../../../data/chatbot_data';
import { Article, RedFlag, ChatbotSuggestion } from '../../../types';

export class LocalChatbotRepository implements ChatbotRepository {
    async getArticles(): Promise<Article[]> {
        return Promise.resolve(ARTICLES);
    }

    async getRedFlags(): Promise<RedFlag[]> {
        return Promise.resolve(RED_FLAGS);
    }

    async getSuggestions(): Promise<ChatbotSuggestion[]> {
        return Promise.resolve(SUGGESTIONS);
    }
}
