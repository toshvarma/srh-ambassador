export type GuestPublicEvent = {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  authorName: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  thumbnailUrl: string;
  club?: { title: string };
  attendees?: Array<{ documentId: string; firstName: string; lastName: string }>;
};

const now = Date.now();

export const guestPublicEvents: GuestPublicEvent[] = [
  {
    id: 9001,
    documentId: "guest-robotics-open-lab",
    slug: "guest-robotics-open-lab",
    title: "SRH Robotics Club Open Lab (Public)",
    shortDescription:
      "A public showcase where visitors can try student-built robots and meet the club team.",
    description:
      "Join the SRH Robotics Club for a hands-on open lab. Visitors can see autonomous robots, test control interfaces, and speak with student builders about upcoming projects.",
    authorName: "SRH Robotics Club",
    start_datetime: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_datetime: new Date(now + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    location: "Innovation Lab, SRH Building B",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80",
    club: { title: "SRH Robotics Club" },
    attendees: [],
  },
  {
    id: 9002,
    documentId: "guest-cube-concert-night",
    slug: "guest-cube-concert-night",
    title: "Summer Concert Night at CUBE",
    shortDescription:
      "An open evening concert at the CUBE building with student bands and guest artists.",
    description:
      "The CUBE hosts a live concert night featuring SRH student bands, international acts, and food stalls. Open to students, faculty, families, and local visitors.",
    authorName: "SRH Cultural Office",
    start_datetime: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(),
    end_datetime: new Date(now + 6 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    location: "CUBE Building, Main Stage",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    attendees: [],
  },
];
