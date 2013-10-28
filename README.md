MongoChemWeb
=========
![MongoChem][MongoChemLogo]

Introduction
------------

MongoChemWeb is an open-source, cross-platform, web application for managing
large collections of chemical data. It uses MongoDB to store and retrieve
data, and can be used in groups to share and search across work being done in
a group. The application uses the VTKWeb framework for interactive 3D
visualization, 2D depiction from Open Babel to show structures in table
views. Some highlights:

* Open source distributed under the liberal 3-clause BSD license
* RESTful API for access from web and other applications
* Import chemical data from other formats
* Python based server-side components that are easily extended

![Open Chemistry project][OpenChemistryLogo]
![Kitware, Inc.][KitwareLogo]

MongoChemWeb is being developed as part of the [Open Chemistry][OpenChemistry]
project at [Kitware][Kitware], along with companion tools and libraries to
support the work.

Installing
----------

We will be working to augment the installation guide in the future, several
components are required to run the framework on a server, with a running
[demonstration available][MongoChemWebDemo].

Contributing
------------

Our project uses Gerrit for code review, and CDash@Home to test proposed
patches before they are merged. Please check our [development][Development]
guide for more details on developing and contributing to the project. The
[project pages][Projects] provide bug, feature and support trackers, along
with many other features such as source browsing.

Our [wiki][Wiki] is used to document features, flesh out designs and host other
documentation. Our API is [documented using Doxygen][Doxygen] with updated
documentation generated nightly. We have several [mailing lists][MailingLists]
to coordinate development and to provide support.

  [MongoChemLogo]: http://openchemistry.org/files/logos/mongochem.png "MongoChem"
  [OpenChemistry]: http://openchemistry.org/ "Open Chemistry Project"
  [OpenChemistryLogo]: http://openchemistry.org/opensourcelogos/openchem100.png "Open Chemistry"
  [Kitware]: http://kitware.com/ "Kitware, Inc."
  [KitwareLogo]: http://www.kitware.com/img/small_logo_over.png "Kitware"
  [Dashboard]: http://cdash.openchemistry.org/index.php?project=MongoChem "MongoChem Dashboard"
  [Build]: http://wiki.openchemistry.org/Build "Building MongoChem"
  [Development]: http://wiki.openchemistry.org/Development "Development guide"
  [Projects]: http://projects.openchemistry.org/ "Project trackers"
  [Wiki]: http://wiki.openchemistry.org/ "Open Chemistry wiki"
  [Doxygen]: http://doc.openchemistry.org/mongochem/api/ "API documentation"
  [MailingLists]: http://openchemistry.org/OpenChemistry/help/mailing.html
  [MongoChemWebDemo]: http://data.openchemistry.org/ "MongoChemWeb Demo"
