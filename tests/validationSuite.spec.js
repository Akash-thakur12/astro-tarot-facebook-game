import { describe, it, expect } from 'vitest';
import { getTopicAndSubType } from '../api/pandit-ai.js';

describe('200-Question Validation Suite', () => {

  const testCases = [
    // Tier 1 - Career (35 queries)
    { q: "Job kab milegi?", expectedTier: 1, expectedTopic: "career" },
    { q: "Naukri kab lagegi?", expectedTier: 1, expectedTopic: "career" },
    { q: "Promotion kab milega?", expectedTier: 1, expectedTopic: "career" },
    { q: "Business kaisa chalega?", expectedTier: 1, expectedTopic: "career" },
    { q: "Salary kab badhegi?", expectedTier: 1, expectedTopic: "career" },
    { q: "Interview kaisa rahega?", expectedTier: 1, expectedTopic: "career" },
    { q: "When will I get a job?", expectedTier: 1, expectedTopic: "career" },
    { q: "Will I get job promotion this year?", expectedTier: 1, expectedTopic: "career" },
    { q: "Vyapar me fayda kab hoga?", expectedTier: 1, expectedTopic: "career" },
    { q: "New business kab shuru karein?", expectedTier: 1, expectedTopic: "career" },
    { q: "Govt job ke yog hain?", expectedTier: 1, expectedTopic: "career" },
    { q: "Private job me change kab hoga?", expectedTier: 1, expectedTopic: "career" },
    { q: "Sarkari naukri kab tak milegi?", expectedTier: 1, expectedTopic: "career" },
    { q: "Salary hike kab hogi?", expectedTier: 1, expectedTopic: "career" },
    { q: "My business is slow, what to do?", expectedTier: 1, expectedTopic: "career" },
    { q: "Interview selection chance?", expectedTier: 1, expectedTopic: "career" },
    { q: "Career growth kab shuru hogi?", expectedTier: 1, expectedTopic: "career" },
    { q: "Will I pass the job interview?", expectedTier: 1, expectedTopic: "career" },
    { q: "Naukri me pareshani kab khatam hogi?", expectedTier: 1, expectedTopic: "career" },
    { q: "Should I switch my career?", expectedTier: 1, expectedTopic: "career" },
    { q: "Naukri chhoot gayi hai, nayi kab milegi?", expectedTier: 1, expectedTopic: "career" },
    { q: "When will my business expand?", expectedTier: 1, expectedTopic: "career" },
    { q: "Sarkari naukri ki taiyari karu?", expectedTier: 1, expectedTopic: "career" },
    { q: "Naukri me tarakki ke yog kab banenge?", expectedTier: 1, expectedTopic: "career" },
    { q: "Will I start a new startup or business?", expectedTier: 1, expectedTopic: "career" },
    { q: "Naukri me transfer kab hoga?", expectedTier: 1, expectedTopic: "career" },
    { q: "Job change opportunity in 2026?", expectedTier: 1, expectedTopic: "career" },
    { q: "Mera vyapar thik nahi chal raha", expectedTier: 1, expectedTopic: "career" },
    { q: "Sarkari naukri ka yog batayein", expectedTier: 1, expectedTopic: "career" },
    { q: "Career problems and remedies?", expectedTier: 1, expectedTopic: "career" },
    { q: "Will I get high salary job?", expectedTier: 1, expectedTopic: "career" },
    { q: "Vyapar me nuksan ho raha hai", expectedTier: 1, expectedTopic: "career" },
    { q: "Job shift or promotion?", expectedTier: 1, expectedTopic: "career" },
    { q: "Sarkari naukri ke liye kon sa upay karein?", expectedTier: 1, expectedTopic: "career" },
    { q: "When is my business partner joining?", expectedTier: 1, expectedTopic: "career" },

    // Tier 1 - Marriage (35 queries)
    { q: "Marriage kab hogi?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Shadi kab hogi?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Vivah kab hoga?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Rishta kab aayega?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Engagement kab hogi?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Jeevan saathi kaisa milega?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "When will my marriage happen?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Will I get a marriage proposal from my crush?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Shadi me deri kyu ho rahi hai?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Vivah ke yog kab banenge?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Love marriage hogi ya arrange?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Rishta kab shuru hoga?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "My engagement date calculation?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Jeevan saathi ka swabhav kaisa hoga?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Arrange marriage chances?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Shadi ke liye upay batayein?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "When will my marriage soulmate arrive?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Vivah bandhan kab shuru hoga?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Shadi kab tak pakki hogi?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Arranged marriage or love marriage yog?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Jeevan saathi se rishta kaisa rahega?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Second marriage kab hogi?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Shadi ke shubh muhurat kab hain?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Will my marriage happen in 2026?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Rishta baar baar toot jata hai?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Engagement delay reasons?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Who is my future marriage partner?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Shadi ke baad kismat chamkegi?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "When is my marriage proposal coming?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Jeevan saathi kis direction se hoga?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Mera rishta kab tak tay hoga?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Will my partner agree for marriage?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Marriage timing calculations?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Vivah me rukawat dur karne ke upay?", expectedTier: 1, expectedTopic: "marriage" },
    { q: "Engagement and shadi kab tak?", expectedTier: 1, expectedTopic: "marriage" },

    // Tier 2 - Daily (20 queries)
    { q: "Aaj ka din kaisa rahega?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Kal ka din kaisa rahega?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Is hafte kya hoga?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Is mahine ki prediction?", expectedTier: 2, expectedTopic: "daily" },
    { q: "My daily horoscope?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Aaj ka shubh rang?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Aaj ka lucky number?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Kal ka lucky color kya hai?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Aaj kya savdhani rakhein?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Is hafte kismat kaisi rahegi?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Daily guidance for today?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Is mahine daily status kaisa rahega?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Aaj ka shubh muhurat?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Kal ka din kaisa jayega?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Is hafte ka rashifal?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Aaj ka lucky color and day?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Kal ke din me kya likha hai?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Is mahine shubh phal milega?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Daily secret update for today?", expectedTier: 2, expectedTopic: "daily" },
    { q: "Aaj ka din shubh hai?", expectedTier: 2, expectedTopic: "daily" },

    // Tier 2 - Love (20 queries)
    { q: "Pyaar kab milega?", expectedTier: 2, expectedTopic: "love" },
    { q: "Will I find true love?", expectedTier: 2, expectedTopic: "love" },
    { q: "Meri crush mujhse pyaar karti hai?", expectedTier: 2, expectedTopic: "love" },
    { q: "Ex kab wapas aayega?", expectedTier: 2, expectedTopic: "love" },
    { q: "Relationship status kaisa rahega?", expectedTier: 2, expectedTopic: "love" },
    { q: "Who is my soulmate?", expectedTier: 2, expectedTopic: "love" },
    { q: "Will my ex text me?", expectedTier: 2, expectedTopic: "love" },
    { q: "Love relationship me anban kab khatam hogi?", expectedTier: 2, expectedTopic: "love" },
    { q: "Crush response?", expectedTier: 2, expectedTopic: "love" },
    { q: "Ex lover patch up chances?", expectedTier: 2, expectedTopic: "love" },
    { q: "Is my partner loyal to me?", expectedTier: 2, expectedTopic: "love" },
    { q: "Pyaar me dhokha kyu mila?", expectedTier: 2, expectedTopic: "love" },
    { q: "Ex boyfriend status now?", expectedTier: 2, expectedTopic: "love" },
    { q: "Will my current love relationship succeed?", expectedTier: 2, expectedTopic: "love" },
    { q: "Crush feels the same for me?", expectedTier: 2, expectedTopic: "love" },
    { q: "Relationship counseling guidance?", expectedTier: 2, expectedTopic: "love" },
    { q: "True love meets timing?", expectedTier: 2, expectedTopic: "love" },
    { q: "Ex returning date?", expectedTier: 2, expectedTopic: "love" },
    { q: "Soulmate connection signs?", expectedTier: 2, expectedTopic: "love" },
    { q: "Pyaar me khushiyan kab aayengi?", expectedTier: 2, expectedTopic: "love" },

    // Tier 2 - Money (20 queries)
    { q: "Paisa kab aayega?", expectedTier: 2, expectedTopic: "money" },
    { q: "Dhan aagman kab hoga?", expectedTier: 2, expectedTopic: "money" },
    { q: "Will I become rich?", expectedTier: 2, expectedTopic: "money" },
    { q: "Crorepati kab banunga?", expectedTier: 2, expectedTopic: "money" },
    { q: "Lottery lagegi meri?", expectedTier: 2, expectedTopic: "money" },
    { q: "Stock market me investment kaisa rahega?", expectedTier: 2, expectedTopic: "money" },
    { q: "Crypto trading profit chances?", expectedTier: 2, expectedTopic: "money" },
    { q: "Property dispute resolution?", expectedTier: 2, expectedTopic: "money" },
    { q: "Karza kab utrega?", expectedTier: 2, expectedTopic: "money" },
    { q: "Dhan labh ke yog batayein?", expectedTier: 2, expectedTopic: "money" },
    { q: "Paisa condition kab sudhregi?", expectedTier: 2, expectedTopic: "money" },
    { q: "Stock investment tips?", expectedTier: 2, expectedTopic: "money" },
    { q: "Property khareedne ka shubh yog?", expectedTier: 2, expectedTopic: "money" },
    { q: "Karz se chhutkara kaise milega?", expectedTier: 2, expectedTopic: "money" },
    { q: "Paisa accumulation chance in 2026?", expectedTier: 2, expectedTopic: "money" },
    { q: "Mera paisa fasa hua hai, kab milega?", expectedTier: 2, expectedTopic: "money" },
    { q: "Lottery ticket selection?", expectedTier: 2, expectedTopic: "money" },
    { q: "Crypto market forecast today?", expectedTier: 2, expectedTopic: "money" },
    { q: "Dhan ki kami dur karne ka upay?", expectedTier: 2, expectedTopic: "money" },
    { q: "Property sale profit chances?", expectedTier: 2, expectedTopic: "money" },

    // Tier 2 - Health (10 queries)
    { q: "Health thik kab hogi?", expectedTier: 2, expectedTopic: "health" },
    { q: "Bimari kab thik hogi?", expectedTier: 2, expectedTopic: "health" },
    { q: "Stress relief remedies?", expectedTier: 2, expectedTopic: "health" },
    { q: "Mental peace kab milegi?", expectedTier: 2, expectedTopic: "health" },
    { q: "Recovery from surgery duration?", expectedTier: 2, expectedTopic: "health" },
    { q: "Fitness goals success?", expectedTier: 2, expectedTopic: "health" },
    { q: "Health problems in future?", expectedTier: 2, expectedTopic: "health" },
    { q: "Bimari thik nahi rehta", expectedTier: 2, expectedTopic: "health" },
    { q: "Bimari se chhutkara kaise milega?", expectedTier: 2, expectedTopic: "health" },
    { q: "Mental pressure and anxiety tips?", expectedTier: 2, expectedTopic: "health" },

    // Tier 2 - Foreign (10 queries)
    { q: "Videsh yatra kab hogi?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "Foreign travel chances?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "Visa kab milega?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "PR in settlement timing?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "Abroad settlement possible?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "Videsh me settlement ke yog?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "Visa status check?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "Abroad studies scholarship?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "Videsh kab jaunga?", expectedTier: 2, expectedTopic: "foreign" },
    { q: "Visa application approval timing?", expectedTier: 2, expectedTopic: "foreign" },

    // Tier 2 - Children (10 queries)
    { q: "Bachcha kab hoga?", expectedTier: 2, expectedTopic: "children" },
    { q: "Santan kab hogi?", expectedTier: 2, expectedTopic: "children" },
    { q: "Bachcha test timing shubh?", expectedTier: 2, expectedTopic: "children" },
    { q: "IVF treatment success chances?", expectedTier: 2, expectedTopic: "children" },
    { q: "Beta hoga ya beti?", expectedTier: 2, expectedTopic: "children" },
    { q: "Bachcha kaisa rahega?", expectedTier: 2, expectedTopic: "children" },
    { q: "Santan sukh kab milega?", expectedTier: 2, expectedTopic: "children" },
    { q: "Santan delay reason?", expectedTier: 2, expectedTopic: "children" },
    { q: "Santan ke bhavishya ke yog?", expectedTier: 2, expectedTopic: "children" },
    { q: "Bachcha ka naamkaran kab karein?", expectedTier: 2, expectedTopic: "children" },

    // Tier 2 - Family (10 queries)
    { q: "Family life me peace kab aayegi?", expectedTier: 2, expectedTopic: "family" },
    { q: "Ghar me shanti ke upay?", expectedTier: 2, expectedTopic: "family" },
    { q: "Bhai ki khushi?", expectedTier: 2, expectedTopic: "family" },
    { q: "Bhai se sambandh sudhrega?", expectedTier: 2, expectedTopic: "family" },
    { q: "Ghar me behen ki baat?", expectedTier: 2, expectedTopic: "family" },
    { q: "Ghar me dispute kab khatam hoga?", expectedTier: 2, expectedTopic: "family" },
    { q: "Ghar banana kab shuru karein?", expectedTier: 2, expectedTopic: "family" },
    { q: "Family harmony remedies?", expectedTier: 2, expectedTopic: "family" },
    { q: "Ghar me vivad chal raha hai", expectedTier: 2, expectedTopic: "family" },
    { q: "Bhai ka blessing kaisa rahega?", expectedTier: 2, expectedTopic: "family" },

    // Tier 2 - Future (10 queries)
    { q: "Agla saal kaisa rahega?", expectedTier: 2, expectedTopic: "future" },
    { q: "6 mahine me kya badlav hoga?", expectedTier: 2, expectedTopic: "future" },
    { q: "Kismat kab chamkegi?", expectedTier: 2, expectedTopic: "future" },
    { q: "Turning point kab aayega?", expectedTier: 2, expectedTopic: "future" },
    { q: "Success kab milegi?", expectedTier: 2, expectedTopic: "future" },
    { q: "What is my future kismat?", expectedTier: 2, expectedTopic: "future" },
    { q: "Agla saal shubh rahega?", expectedTier: 2, expectedTopic: "future" },
    { q: "Kismat kab badlegi?", expectedTier: 2, expectedTopic: "future" },
    { q: "Jeevan me turning point kab milega?", expectedTier: 2, expectedTopic: "future" },
    { q: "Future success timing?", expectedTier: 2, expectedTopic: "future" },

    // Tier 3 - Nazar (5 queries)
    { q: "Nazar lag gayi hai kaise thik karein?", expectedTier: 3, expectedTopic: "nazar" },
    { q: "Negative energy dur karne ka upay?", expectedTier: 3, expectedTopic: "nazar" },
    { q: "Bhoot ka saya?", expectedTier: 3, expectedTopic: "nazar" },
    { q: "Negative energy or black magic kiya hai kisi ne?", expectedTier: 3, expectedTopic: "nazar" },
    { q: "Atma ya paranormal darr?", expectedTier: 3, expectedTopic: "nazar" },

    // Tier 3 - Dreams (5 queries)
    { q: "Sapne me saanp dekhne ka matlab?", expectedTier: 3, expectedTopic: "dreams" },
    { q: "Sapna sacha hota hai?", expectedTier: 3, expectedTopic: "dreams" },
    { q: "Sapne me paani dekhna shubh hai?", expectedTier: 3, expectedTopic: "dreams" },
    { q: "Mandir ya shivling dekhna sapne me?", expectedTier: 3, expectedTopic: "dreams" },
    { q: "Bure sapne se bachne ke upay?", expectedTier: 3, expectedTopic: "dreams" },

    // Tier 3 - Spiritual (5 queries)
    { q: "Isht dev kaun hain mere?", expectedTier: 3, expectedTopic: "spiritual" },
    { q: "Mantra jaap kaise karein?", expectedTier: 3, expectedTopic: "spiritual" },
    { q: "Vrat aur pooja niyam?", expectedTier: 3, expectedTopic: "spiritual" },
    { q: "Gemstone wear logic?", expectedTier: 3, expectedTopic: "spiritual" },
    { q: "Bhagya dosh aur nivaran upay?", expectedTier: 3, expectedTopic: "spiritual" },

    // Tier 3 - Lucky (5 queries)
    { q: "Lucky day logic?", expectedTier: 3, expectedTopic: "lucky" },
    { q: "Lucky direction for me?", expectedTier: 3, expectedTopic: "lucky" },
    { q: "Lucky vehicle selection path?", expectedTier: 3, expectedTopic: "lucky" },
    { q: "Lucky day for study?", expectedTier: 3, expectedTopic: "lucky" },
    { q: "Lucky date for registration?", expectedTier: 3, expectedTopic: "lucky" }
  ];

  it('should verify all 200 questions classification and log pass/fail counts', () => {
    let passCount = 0;
    let failCount = 0;

    for (const testCase of testCases) {
      const res = getTopicAndSubType(testCase.q);
      const isPass = res.tier === testCase.expectedTier && res.topic === testCase.expectedTopic;
      if (isPass) {
        passCount++;
      } else {
        failCount++;
        console.warn(`FAIL: "${testCase.q}" -> Classified as { tier: ${res.tier}, topic: "${res.topic}" } but expected { tier: ${testCase.expectedTier}, topic: "${testCase.expectedTopic}" }`);
      }
    }

    console.log(`\n=== 200-QUESTION VALIDATION SUITE SUMMARY ===`);
    console.log(`Total test cases: ${testCases.length}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`==============================================\n`);

    expect(passCount).toBe(200);
    expect(failCount).toBe(0);
  });
});
