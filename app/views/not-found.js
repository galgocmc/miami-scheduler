import React, { Component } from 'react';

import './not-found.scss';

export default class NotFound extends Component {

  render() {
    return (
      <div className="view not-found-view">
        <i className="fa fa-question-circle-o"></i>
        <span>Page Not Found</span>
      </div>
    );
  }

}