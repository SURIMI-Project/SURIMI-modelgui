from buf.validate import validate_pb2 as _validate_pb2
from surimi.v1 import fleet_segment_pb2 as _fleet_segment_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class DispositionGrid(_message.Message):
    __slots__ = ("species", "fleet_segment", "disposition_cells")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    FLEET_SEGMENT_FIELD_NUMBER: _ClassVar[int]
    DISPOSITION_CELLS_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    fleet_segment: _fleet_segment_pb2.FleetSegment
    disposition_cells: _containers.RepeatedCompositeFieldContainer[DispositionCell]
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., fleet_segment: _Optional[_Union[_fleet_segment_pb2.FleetSegment, _Mapping]] = ..., disposition_cells: _Optional[_Iterable[_Union[DispositionCell, _Mapping]]] = ...) -> None: ...

class DispositionCell(_message.Message):
    __slots__ = ("longitude", "latitude", "gross_catch", "live_discards", "dead_discards")
    LONGITUDE_FIELD_NUMBER: _ClassVar[int]
    LATITUDE_FIELD_NUMBER: _ClassVar[int]
    GROSS_CATCH_FIELD_NUMBER: _ClassVar[int]
    LIVE_DISCARDS_FIELD_NUMBER: _ClassVar[int]
    DEAD_DISCARDS_FIELD_NUMBER: _ClassVar[int]
    longitude: float
    latitude: float
    gross_catch: float
    live_discards: float
    dead_discards: float
    def __init__(self, longitude: _Optional[float] = ..., latitude: _Optional[float] = ..., gross_catch: _Optional[float] = ..., live_discards: _Optional[float] = ..., dead_discards: _Optional[float] = ...) -> None: ...

class CatchDispositionSummary(_message.Message):
    __slots__ = ("disposition_grids",)
    DISPOSITION_GRIDS_FIELD_NUMBER: _ClassVar[int]
    disposition_grids: _containers.RepeatedCompositeFieldContainer[DispositionGrid]
    def __init__(self, disposition_grids: _Optional[_Iterable[_Union[DispositionGrid, _Mapping]]] = ...) -> None: ...
