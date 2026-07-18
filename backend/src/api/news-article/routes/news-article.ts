import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::news-article.news-article', {
    config: {
        delete: {
            policies: ['global::is-owner'],
        },
        update: {
            policies: ['global::is-owner'],
        },
    },
});