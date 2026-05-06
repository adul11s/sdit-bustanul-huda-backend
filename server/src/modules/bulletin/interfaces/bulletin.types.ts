export interface Bulletin {
  id: string;
  title: string;
  content: string;
  image: string | null;
  category: string;
  eventDate: Date | null;
  status: string;
  authorId: string;
  createdAt: Date;
}