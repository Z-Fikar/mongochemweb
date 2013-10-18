r"""
"""

# import to process args
import sys
import os

# import vtk modules.
import vtk
from vtk.web import server, wamp, protocols

# import annotations
from autobahn.wamp import exportRpc

try:
    import argparse
except ImportError:
    # since  Python 2.6 and earlier don't have argparse, we simply provide
    # the source for the same as _argparse and we use it instead.
    import _argparse as argparse

import inchi
import sys
import traceback

# =============================================================================
# Create custom File Opener class to handle clients requests
# =============================================================================

class _WebMolecule(wamp.ServerProtocol):
    authKey = "vtkweb-secret"

    # Application configuration
    def __init__(self):
      self.view = None
      wamp.ServerProtocol.__init__(self)

    @exportRpc
    def load(self, inchi_string):

      self.reader = vtk.vtkCMLMoleculeReader()
      #self.reader.SetFileName('/home/cjh/work/VTKData/Data/porphyrin.cml')
      self.mapper = vtk.vtkMoleculeMapper()
      self.mapper.SetInputConnection(self.reader.GetOutputPort())
      self.mapper.UseBallAndStickSettings()

      self.actor = vtk.vtkActor()
      self.actor.SetMapper(self.mapper)

      self.renderer = vtk.vtkRenderer()
      self.window = vtk.vtkRenderWindow()
      self.window.AddRenderer(self.renderer);

      interactor = vtk.vtkRenderWindowInteractor()
      interactor.SetRenderWindow(self.window);
      interactor.GetInteractorStyle().SetCurrentStyleToTrackballCamera()

      self.renderer.AddActor(self.actor);
      self.renderer.SetBackground(1,1,1);

      # VTK Web application specific
      _WebMolecule.view = self.window

      # VTK Web application specific
      _WebMolecule.view = self.window
      self.Application.GetObjectIdMap().SetActiveObject("VIEW", self.window)


      try:
        path = inchi.to_cml(inchi_string)
        self.reader.SetFileName(path)
        self.reader.Update()
        bounds = [0,0,0,0,0,0]
        self.mapper.GetBounds(bounds)
        os.remove(path)
        self.renderer.ResetCamera(bounds)
        self.renderer.GetActiveCamera().Zoom(1.5);
      except:
        print traceback.format_exc()

    def initialize(self):
        # Bring used components
        self.registerVtkWebProtocol(protocols.vtkWebMouseHandler())
        self.registerVtkWebProtocol(protocols.vtkWebViewPort())
        self.registerVtkWebProtocol(protocols.vtkWebViewPortImageDelivery())

        # Update authentication key to use
        self.updateSecret(_WebMolecule.authKey)

        # Create default pipeline (Only once for all the session)
        if not self.view:
            self.reader = vtk.vtkCMLMoleculeReader()
            #self.reader.SetFileName('/home/cjh/work/VTKData/Data/porphyrin.cml')
            self.mapper = vtk.vtkMoleculeMapper()
            self.mapper.SetInputConnection(self.reader.GetOutputPort())
            self.mapper.UseBallAndStickSettings()

            self.actor = vtk.vtkActor()
            self.actor.SetMapper(self.mapper)

            self.renderer = vtk.vtkRenderer()
            self.window = vtk.vtkRenderWindow()
            self.window.AddRenderer(self.renderer);

            interactor = vtk.vtkRenderWindowInteractor()
            interactor.SetRenderWindow(self.window);
            interactor.GetInteractorStyle().SetCurrentStyleToTrackballCamera()

            self.renderer.AddActor(self.actor);
            self.renderer.SetBackground(1,1,1);

            # VTK Web application specific
            _WebMolecule.view = self.window
            self.Application.GetObjectIdMap().SetActiveObject("VIEW", self.window)

# =============================================================================
# Main: Parse args and start server
# =============================================================================

if __name__ == "__main__":
    # Create argument parser
    parser = argparse.ArgumentParser(description="VTK/Web Molecule web-application")

    # Add default arguments
    server.add_arguments(parser)

    # Exctract arguments
    args = parser.parse_args()

    # Configure our current application
    #_WebMolecule.authKey = args.authKey

    # Start server
    server.start_webserver(options=args, protocol=_WebMolecule)
