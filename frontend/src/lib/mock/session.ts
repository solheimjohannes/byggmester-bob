import { MOCK_USER } from './data';

// TODO: MOCK SESSION — remove this file before production
export const MOCK_SESSION = {
  user: {
    id: MOCK_USER.id,
    name: MOCK_USER.name,
    email: MOCK_USER.email,
    image: MOCK_USER.image,
  },
  expires: '2099-01-01T00:00:00.000Z',
};
