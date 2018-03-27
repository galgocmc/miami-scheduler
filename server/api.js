const express = require('express');
const axios = require('axios');

function toMinutes(time) {
  if (!time) return -1;
  const [h, m] = time.split(':');
  return 60 * parseInt(h) + parseInt(m);
}

module.exports = function(db) {
  const router = express.Router();

  router.get('/terms', async (req, res) => {
    const terms = await db.terms.find();
    res.json({ terms });
  });

  router.get('/search', async (req, res) => {
    const { term, query } = req.query;
    const courses = await db.courses.search(
      {
        term: `'${query}'`,
        fields: ['subject', 'number', 'title', 'searchables'],
        where: {
          term
        }
      },
      {
        fields: ['code', 'subject', 'number', 'title'],
        limit: 50
      }
    );

    res.json({ courses });
  });

  router.get('/courses', async (req, res) => {
    const { code, term, subject, number } = req.query;

    const plan = {};
    if (code) plan.code = code.toUpperCase().split(',');
    if (term) plan.term = term.split(',');
    if (subject) plan.subject = subject.toUpperCase().split(',');
    if (number) plan.number = number.split(',');

    const courses = await db.courses.find(plan, {
      fields: ['code', 'subject', 'number', 'title'],
      limit: 50
    });

    res.json({ courses });
  });

  router.get('/courses/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const course = await db.courses.find(
        { code },
        { fields: ['code', 'term', 'subject', 'number', 'title'], single: true }
      );

      const { data } = await axios.get(
        `http://ws.miamioh.edu/courseSectionV2/${
          course.term
        }.json?campusCode=O&courseSubjectCode=${course.subject}&courseNumber=${
          course.number
        }`
      );
      course.sections = data.courseSections.map(courseSection => ({
        crn: courseSection.courseId,
        name: courseSection.courseSectionCode,
        slots: parseInt(courseSection.enrollmentCountAvailable),
        credits: [
          ...new Set([
            parseInt(courseSection.creditHoursLow),
            parseInt(courseSection.creditHoursHigh)
          ])
        ],
        meets: courseSection.courseSchedules.map(courseSchedule => ({
          days: courseSchedule.days,
          start_time: toMinutes(courseSchedule.startTime),
          end_time: toMinutes(courseSchedule.endTime),
          location: `${courseSchedule.buildingCode} ${courseSchedule.room}`
        }))
      }));
      res.json({ course });
    } catch (e) {
      console.log(e.stack);
    }
  });

  return router;
};