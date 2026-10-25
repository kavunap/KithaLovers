export type ConnectionPurpose = 'friendship' | 'dating' | 'both';
export type Profile = {
  id: string;
  displayName: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  photoUrl: string;
};
