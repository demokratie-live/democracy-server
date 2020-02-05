// TODO replace this with a scraper for automatiation

// convert german date to js Date
function parseDate(input) {
  const parts = input.match(/(\d+)/g);
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

export const conferenceWeeks = [
  {
    start: parseDate('13.01.2020'),
    end: parseDate('17.01.2020'),
  },
  {
    start: parseDate('27.01.2020'),
    end: parseDate('31.01.2020'),
  },
  {
    start: parseDate('10.02.2020'),
    end: parseDate('14.02.2020'),
  },
  {
    start: parseDate('02.03.2020'),
    end: parseDate('06.03.2020'),
  },
  {
    start: parseDate('09.03.2020'),
    end: parseDate('13.03.2020'),
  },
  {
    start: parseDate('23.03.2020'),
    end: parseDate('27.03.2020'),
  },
  {
    start: parseDate('20.04.2020'),
    end: parseDate('24.04.2020'),
  },
  {
    start: parseDate('04.05.2020'),
    end: parseDate('07.05.2020'),
  },
  {
    start: parseDate('11.05.2020'),
    end: parseDate('15.05.2020'),
  },
  {
    start: parseDate('25.05.2020'),
    end: parseDate('29.05.2020'),
  },
  {
    start: parseDate('15.06.2020'),
    end: parseDate('19.06.2020'),
  },
  {
    start: parseDate('29.06.2020'),
    end: parseDate('03.07.2020'),
  },
  {
    start: parseDate('07.09.2020'),
    end: parseDate('11.09.2020'),
  },
  {
    start: parseDate('14.09.2020'),
    end: parseDate('18.09.2020'),
  },
  {
    start: parseDate('28.09.2020'),
    end: parseDate('02.10.2020'),
  },
  {
    start: parseDate('05.10.2020'),
    end: parseDate('09.10.2020'),
  },
  {
    start: parseDate('26.10.2020'),
    end: parseDate('30.10.2020'),
  },
  {
    start: parseDate('02.11.2020'),
    end: parseDate('06.11.2020'),
  },
  {
    start: parseDate('16.11.2020'),
    end: parseDate('20.11.2020'),
  },
  {
    start: parseDate('23.11.2020'),
    end: parseDate('27.11.2020'),
  },
  {
    start: parseDate('07.12.2020'),
    end: parseDate('11.12.2020'),
  },
  {
    start: parseDate('14.12.2020'),
    end: parseDate('18.12.2020'),
  },
];

// return the current or next conference week
export const getCurrentConferenceWeek = () => {
  const curDate = new Date();

  // find actual or return undefined
  const currentConferenceWeek = conferenceWeeks.find(({ start, end }) => {
    return curDate > start && curDate < end;
  });
  // if there is one running return
  if (currentConferenceWeek) {
    return currentConferenceWeek;
  }

  // else return next conference week
  const nextConferenceWeek = conferenceWeeks.find(({ start, end }) => {
    return curDate < start;
  });
  return nextConferenceWeek;
};
