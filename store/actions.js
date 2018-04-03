import axios from 'axios';

import { getSchedules } from './generator';

const schedulesPerPage = {
  detailed: 1,
  compact: 3
};

const filterDefauls = {
  class_time: {
    operator: 'start_after',
    time: '10:00 AM',
    days: ['M', 'W', 'F']
  },
  class_load: {
    operator: 'at_most',
    amount: 3,
    days: ['M', 'W', 'F']
  },
  break_time: {
    from: '11:00 AM',
    until: '12:00 PM',
    days: ['M', 'W', 'F']
  }
};

export function fetchTerms(getState, setState) {
  return async function() {
    const { data } = await axios.get('/api/terms');
    setState({
      terms: data.terms,
      selectedTerm: data.terms[0].code
    });
  };
}

export function selectTerm(getState, setState) {
  return function(termId) {
    setState({
      selectedTerm: termId,
      selectedCourses: [],
      generatedSchedules: []
    });
  };
}

export function searchCourses(getState, setState) {
  return async function(term, query) {
    if (!query) {
      setState({
        searchedCourses: []
      });
    } else {
      const { data } = await axios.get(
        `/api/search?term=${term}&query=${query}`
      );
      setState(({ coursesByCode }) => {
        return {
          searchedCourses: data.courses,
          coursesByCode: data.courses.reduce((acc, course) => {
            return { ...acc, [course.code]: course };
          }, coursesByCode)
        };
      });
    }
  };
}

export function selectCourse(getState, setState, getActions) {
  return async function(code) {
    const { loadingCourses, selectedCourses } = getState();
    if (loadingCourses.concat(selectedCourses).includes(code)) {
      return;
    }

    setState(state => {
      return {
        loadingCourses: state.loadingCourses.concat(code)
      };
    });

    const { fetchCourse } = getActions();
    fetchCourse(code);
  };
}

export function fetchCourse(getState, setState, getActions) {
  return async function(code) {
    const { data } = await axios.get(`/api/courses/${code}`);
    await setState(state => {
      return {
        selectedCourses: state.selectedCourses.concat(code),
        loadingCourses: state.loadingCourses.filter(c => c !== code),
        coursesByCode: {
          ...state.coursesByCode,
          [code]: data.course
        },
        sectionsByCrn: data.course.sections.reduce((acc, section) => {
          return { ...acc, [section.crn]: section };
        }, state.sectionsByCrn)
      };
    });

    const { generateSchedules } = getActions();
    generateSchedules();
  };
}

export function deselectCourse(getState, setState, getActions) {
  return async function(code) {
    await setState(({ selectedCourses }) => {
      if (selectedCourses.includes(code)) {
        return {
          selectedCourses: selectedCourses.filter(c => c !== code),
          currentSchedule: 0
        };
      } else {
        return { selectedCourses };
      }
    });

    const { generateSchedules } = getActions();
    generateSchedules();
  };
}

export function generateSchedules(getState, setState) {
  return async function() {
    const currentState = getState();
    const id = currentState.selectedCourses.join('');
    setState({
      generatingSchedules: {
        ...currentState.generatingSchedules,
        [id]: true
      }
    });

    const generatedSchedules = await generateSchedules(currentState);
    setState(({ generatingSchedules }) => {
      return {
        generatedSchedules,
        generatingSchedules: {
          ...generatingSchedules,
          [id]: false
        }
      };
    });
  };
}

export function createFilter(getState, setState) {
  return function(type) {
    setState(({ scheduleFilters }) => {
      const id = Math.max(...scheduleFilters.map(filter => filter.id)) + 1;
      return {
        scheduleFilters: [
          ...scheduleFilters,
          { id, type, ...filterDefauls[type] }
        ],
        filtersChanged: true
      };
    });
  };
}

export function updateFilter(getState, setState) {
  return function(id, update) {
    setState(({ scheduleFilters }) => {
      return {
        scheduleFilters: scheduleFilters.map(
          filter => (filter.id === id ? { ...filter, ...update } : filter)
        ),
        filtersChanged: true
      };
    });
  };
}

export function deleteFilter(getState, setState) {
  return function(id) {
    setState(({ scheduleFilters }) => {
      return {
        scheduleFilters: scheduleFilters.filter(filter => filter.id !== id),
        filtersChanged: true
      };
    });
  };
}

export function applyFilters(getState, setState) {
  return function() {
    setState(state => {
      return {
        filteredSchedules: [],
        filtersChanged: false
      };
    });
  };
}

export function selectScheduleView(getState, setState) {
  return function(view) {
    setState(({ scheduleView }) => {
      if (scheduleView !== view) {
        return {
          scheduleView: view,
          currentSchedule: 0
        };
      } else {
        return {};
      }
    });
  };
}

export function selectScheduleSort(getState, setState) {
  return function(sort) {
    setState(({ scheduleSort }) => {
      if (scheduleSort !== sort) {
        return {
          scheduleSort: sort
        };
      } else {
        return {};
      }
    });
  };
}

export function prevSchedule(getState, setState) {
  return function() {
    setState(({ currentSchedule }) => {
      return {
        currentSchedule: Math.max(currentSchedule - 1, 0)
      };
    });
  };
}

export function nextSchedule(getState, setState) {
  return function() {
    setState(({ currentSchedule, generatedSchedules, scheduleView }) => {
      return {
        currentSchedule: Math.min(
          currentSchedule + 1,
          Math.ceil(
            generatedSchedules.length / schedulesPerPage[scheduleView]
          ) - 1
        )
      };
    });
  };
}
