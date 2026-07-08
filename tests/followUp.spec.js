import { isFollowUpMessage } from '../api/pandit-ai.js';

describe('Follow-up Detection (isFollowUpMessage)', () => {
  const followUpCases = [
    'hn',
    'hnn',
    'haan',
    'ji',
    'ji hnn',
    'ji haan',
    'ji btaiye',
    'haan ji',
    'haan ji btaiye',
    'btaiye',
    'batao',
    'aur batao',
    'aur btaiye',
    'next',
    'detail',
    'more',
    'ok',
    'okay',
    'yes',
    'yes btaiye',
    'ji hnn btaiye',
    'ok detail'
  ];

  followUpCases.forEach(text => {
    it(`should detect "${text}" as a follow-up message`, () => {
      expect(isFollowUpMessage(text)).toBe(true);
    });
  });

  const negativeCases = [
    'kya mera business chalega',
    'mere marriage ke baare me batao',
    'hello',
    'namaste'
  ];

  negativeCases.forEach(text => {
    it(`should NOT detect "${text}" as a follow-up message`, () => {
      expect(isFollowUpMessage(text)).toBe(false);
    });
  });
});
