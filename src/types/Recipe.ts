export interface Recipe {
  id: string;
  name: string;
  imageLink: string;
  jsonLink?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}