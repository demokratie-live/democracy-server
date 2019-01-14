import CONSTANTS from './../../config/constants';

export default {
  Query: {
    memberByConstituencyPeriod: async (
      parent,
      { constituency, period = CONSTANTS.MIN_PERIOD } /* {}, */,
    ) => ({
      _id: 'DUMMYID',
      imgURL:
        'https://www.bundestag.de/image/520886/3x4/284/379/bc85d69c1ceedac5ded1231ed6cd3f58/QT/kauder_volker_gross.jpg',
      name: 'Volker Kauder',
      party: 'CDU/CSU',
      job: 'Jurist',
      bio:
        'Geboren am 3. September 1949 in Hoffenheim; evangelisch; verheiratet.\n\n' +
        'Abitur 1969 am Hegau-Gymnasium Singen.\n\n' +
        '1969 bis 1971 Wehrdienst, Fähnrich der Reserve.\n\n' +
        '1971 bis 1975 Studien der Rechts- und Staatswissenschaft an der Universität Freiburg, 1975 erstes, 1977 zweites juristisches Staatsexamen.\n\n' +
        '1976 bis 1978 Beauftragter des Rektors für politische Bildung an der Universität Freiburg; 1979 Eintritt in die Innenverwaltung Baden-Württemberg, 1980 bis 1990 stellvertretender Landrat im Landratsamt Tuttlingen.\n\n' +
        'Ehrenvorsitzender des Psychosozialen Förderkreises Tuttlingen.\n\n' +
        '1966 bis 1984 Mitglied der Jungen Union; 1969 bis 1973 Kreisvorsitzender der Jungen Union Konstanz, 1973 bis 1976 ehrenamtlicher Geschäftsführer und Bezirksvorstandsmitglied der Jungen Union Südbaden; 1975 bis 1991 Pressesprecher und Vorstandsmitglied der CDU Südbaden; 1984 bis 1986 Vorsitzender des CDU-Stadtverbandes Tuttlingen; 1985 bis 1999 Vorsitzender des CDU-Kreisverbandes Tuttlingen; 1991 bis 2005 Generalsekretär der CDU Baden-Württemberg; Januar bis November 2005 Generalsekretär der CDU Deutschlands.\n\n' +
        'Mitglied des Bundestages seit 1990; 1998 bis 2002 Vorsitzender der CDU-Landesgruppe Baden-Württemberg, Oktober 2002 bis Januar 2005 1. Parlamentarischer Geschäftsführer der CDU/CSU-Fraktion, 2005 bis 2018 Vorsitzender der CDU/CSU-Fraktion.',
      constituency, // "285",
      period,
      contact: {
        address: 'Deutscher Bundestag\nPlatz der Republik 1\n11011 Berlin',
        email: 'volker.kauder@bundestag.de',
        socialMedia: [
          {
            service: 'volker-kauder.de',
            url: 'http://www.volker-kauder.de',
          },
        ],
      },
    }),
  },
};
