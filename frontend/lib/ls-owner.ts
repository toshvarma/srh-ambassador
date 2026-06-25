export default async(policyContext: { state: { user: any; }; params: { id: any; }; }, _config: any, {strapi}: any) => {
    const currentUser = policyContext.state.user;
    const eventID = policyContext.params.id;

    if (!currentUser || typeof eventID === 'undefined') {
        return false;
    }

    const event = await strapi.documents('api:events').findOne({
        documentId: eventID,
        populate: {
            author: {
                fields: ['documentId']
            }
        }
    });

return event.author.documentId === currentUser.documentId;
}