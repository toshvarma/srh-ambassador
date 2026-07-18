export default async (
    policyContext: { state: { user: any }; params: { id: any } },
    _config: any,
    { strapi }: any
) => {
    const currentUser = policyContext.state.user;
    const documentId = policyContext.params.id;

    if (!currentUser || typeof documentId === 'undefined') {
        return false;
    }

    const article = await strapi.documents('api::news-article.news-article').findOne({
        documentId,
        populate: {
            author: {
                fields: ['documentId'],
            },
        },
    });

    return article?.author?.documentId === currentUser.documentId;
};