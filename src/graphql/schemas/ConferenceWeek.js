export default `

type ConferenceWeek {
  start: Date!
  end: Date!
}

type Query {
  currentConferenceWeek: ConferenceWeek!
}
`;
