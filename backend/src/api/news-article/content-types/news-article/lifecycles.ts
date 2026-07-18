export default {
    async beforeCreate(event: any) {
        const { data } = event.params;
        const user = event.state?.user;

        // Auto-fill creation datetime
        data.whenCreated = new Date().toISOString();

        // Auto-fill username and author relation from logged-in user
        if (user) {
            data.username = user.username;
            data.author = user.id;
        }
    },

    async beforeUpdate(event: any) {
        const { data } = event.params;
        const user = event.state?.user;

        // Auto-fill published datetime when article is published
        if (data.articleStatus === 'published' && !data.whenPublished) {
            data.whenPublished = new Date().toISOString();
        }

        // Auto-fill uploaded datetime on first update
        if (!data.whenUploaded) {
            data.whenUploaded = new Date().toISOString();
        }
    },
};