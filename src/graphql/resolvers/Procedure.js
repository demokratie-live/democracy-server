/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
export default {
  Query: {
    procedures: async (parent, { type, offset, pageSize }, { ProcedureModel }) => {
      // Bundesrat hat Zustimmung versagt: 6
      // Für mit dem Grundgesetz unvereinbar erklärt: 2
      // Teile des Gesetzes für nichtig erklärt: 1
      // Verkündet: 4836
      // Überwiesen: 9
      // Für gegenstandslos erklärt: 1
      // Dem Bundestag zugeleitet - Noch nicht beraten: 5
      // Bundesrat hat zugestimmt: 2
      // Zusammengeführt mit... (siehe Vorgangsablauf): 222
      // Für erledigt erklärt: 482
      // Nicht ausgefertigt wegen Zustimmungsverweigerung des Bundespräsidenten: 3
      // Bundesrat hat Einspruch eingelegt: 1
      // Bundesrat hat Vermittlungsausschuss nicht angerufen: 1
      // Abgelehnt: 1123
      // Zustimmung versagt: 11
      // Verabschiedet: 2
      // Noch nicht beraten: 15
      // : 301
      // Im Vermittlungsverfahren: 1
      // Keine parlamentarische Behandlung: 2
      // Vermittlungsvorschlag liegt vor: 4
      // Nicht abgeschlossen - Einzelheiten siehe Vorgangsablauf: 1142
      // : 5

      let currentStates = [];
      switch (type) {
        case 'PREPARATION':
          currentStates = [
            'Dem Bundesrat zugeleitet - Noch nicht beraten',
            'Den Ausschüssen zugewiesen',
            'Einbringung abgelehnt',
            '1. Durchgang im Bundesrat abgeschlossen',
          ];
          break;
        case 'VOTING':
          currentStates = [
            'Beschlussempfehlung liegt vor',
            // Unterhalb keys für Vergangen
            'Zurückgezogen',
            'Abgeschlossen - Ergebnis siehe Vorgangsablauf',
            'Für nichtig erklärt',
            'Erledigt durch Ablauf der Wahlperiode',
            'Verkündet',
          ];
          break;
        case 'HOT':
          currentStates = [];
          break;

        default:
          break;
      }
      return ProcedureModel.find({ currentStatus: { $in: currentStates } })
        .sort({ voteDate: -1 })
        .skip(offset)
        .limit(pageSize);
    },
  },
};
