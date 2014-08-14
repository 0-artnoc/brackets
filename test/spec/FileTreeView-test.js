/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*global $, define, brackets, describe, it, xit, beforeEach, expect, setTimeout, waitsForDone, runs, spyOn */
/*unittests: FileTreeView*/

define(function (require, exports, module) {
    "use strict";
    
    var FileTreeView = require("project/FileTreeView"),
        React = require("thirdparty/react"),
        Immutable = require("thirdparty/immutable"),
        RTU = React.addons.TestUtils;

    describe("FileTreeView", function () {
        describe("ViewModel", function () {
            var subdir = {
                fullPath: "/path/to/project/subdir/",
                name: "subdir",
                isFile: false
            },
                contents = [
                    {
                        fullPath: "/path/to/project/README.md",
                        name: "README.md",
                        isFile: true
                    },
                    {
                        fullPath: "/path/to/project/afile.js",
                        name: "afile.js",
                        isFile: true
                    },
                    subdir
                ];
            
            describe("_formatDirectoryContents", function () {
                it("should convert file and directory objects for display", function () {
                    var result = FileTreeView._formatDirectoryContents("", contents);
                    expect(result.toJS()).toEqual([
                        {
                            name: "README",
                            extension: ".md"
                        },
                        {
                            name: "afile",
                            extension: ".js"
                        },
                        {
                            name: "subdir",
                            directory: "subdir/"
                        }
                    ]);
                });
                
                it("should treat dotfiles as filenames and not extensions", function () {
                    var result = FileTreeView._formatDirectoryContents("", [
                        {
                            fullPath: "/path/to/.dotfile",
                            name: ".dotfile",
                            isFile: true
                        }
                    ]);
                    expect(result.toJS()).toEqual([
                        {
                            name: ".dotfile",
                            extension: ""
                        }
                    ]);
                });
            });
            
            describe("_sortFormattedDirectory", function () {
                it("should sort alphabetically", function () {
                    var formatted = Immutable.fromJS([
                        {
                            name: "README",
                            extension: ".md"
                        },
                        {
                            name: "afile",
                            extension: ".js"
                        },
                        {
                            name: "subdir",
                            directory: "subdir/"
                        }
                    ]);
                    expect(FileTreeView._sortFormattedDirectory(formatted).toJS()).toEqual([
                        {
                            name: "afile",
                            extension: ".js"
                        },
                        {
                            name: "README",
                            extension: ".md"
                        },
                        {
                            name: "subdir",
                            directory: "subdir/"
                        }
                    ]);
                });
                
                it("should include the extension in the sort", function () {
                    var formatted = Immutable.fromJS([
                        {
                            name: "README",
                            extension: ".txt"
                        },
                        {
                            name: "README",
                            extension: ".md"
                        },
                        {
                            name: "README",
                            extension: ""
                        }
                    ]);
                    expect(FileTreeView._sortFormattedDirectory(formatted).toJS()).toEqual([
                        {
                            name: "README",
                            extension: ""
                        },
                        {
                            name: "README",
                            extension: ".md"
                        },
                        {
                            name: "README",
                            extension: ".txt"
                        }
                    ]);
                });
                
                it("can sort by directories first", function () {
                    var formatted = Immutable.fromJS([
                        {
                            name: "README",
                            extension: ".md"
                        },
                        {
                            name: "afile",
                            extension: ".js"
                        },
                        {
                            name: "subdir",
                            directory: "subdir/"
                        }
                    ]);
                    expect(FileTreeView._sortFormattedDirectory(formatted, true).toJS()).toEqual([
                        {
                            name: "subdir",
                            directory: "subdir/"
                        },
                        {
                            name: "afile",
                            extension: ".js"
                        },
                        {
                            name: "README",
                            extension: ".md"
                        }
                    ]);
                });
            });
            
            describe("updateContents", function () {
                var root = {
                    fullPath: "/path/to/project/",
                    getContents: function (callback) {
                        setTimeout(function () {
                            callback(null, contents);
                        }, 10);
                    }
                };
                
                it("should create a formatted, sorted list of objects", function () {
                    var vm = new FileTreeView.ViewModel();
                    
                    var changeFired = false;
                    vm.on(FileTreeView.CHANGE, function () {
                        changeFired = true;
                    });
                    
                    waitsForDone(vm.setProjectRoot(root));
                    
                    runs(function () {
                        expect(vm.treeData.toJS()).toEqual({
                            "": {
                                children: [
                                    {
                                        name: "afile",
                                        extension: ".js"
                                    },
                                    {
                                        name: "README",
                                        extension: ".md"
                                    },
                                    {
                                        name: "subdir",
                                        directory: "subdir/"
                                    }
                                ]
                            }
                        });
                        expect(changeFired).toBe(true);
                    });
                });
                
                it("should reset the treeData if the project root changes", function () {
                    var vm = new FileTreeView.ViewModel();
                    waitsForDone(vm.setProjectRoot(root));
                    waitsForDone(vm.setProjectRoot(root));
                    runs(function () {
                        expect(vm.treeData.get("").get("children").length).toBe(3);
                    });
                });
            });
            
            describe("toggleDirectory", function () {
                it("should throw if it is passed a file and not a directory", function () {
                    var vm = new FileTreeView.ViewModel();
                    try {
                        vm._toggleDirectory("afile.js");
                        expect("should have thrown an error").toBe("but it didn't");
                    } catch (e) {
                        // Do nothing. This is actually what we expect.
                    }
                });
                
                it("should close a directory that's open", function () {
                    var vm = new FileTreeView.ViewModel(),
                        treeData = vm.treeData = Immutable.fromJS({
                            "": {
                                children: [
                                    {
                                        name: "subdir",
                                        directory: "subdir/"
                                    }
                                ]
                            },
                            "subdir/": {
                                children: [
                                    {
                                        name: "afile",
                                        extension: ".js"
                                    }
                                ]
                            }
                        });
                    
                    var changeFired = false;
                    vm.on(FileTreeView.CHANGE, function () {
                        changeFired = true;
                    });
                    
                    waitsForDone(vm._toggleDirectory("subdir/"));
                    runs(function () {
                        expect(vm.treeData.get("subdir/")).toBeUndefined();
                        expect(changeFired).toBe(true);
                    });
                });
                
                it("should open a directory that's closed", function () {
                    var vm = new FileTreeView.ViewModel();
                    vm.treeData = Immutable.fromJS({
                        "": {
                            children: [
                                {
                                    name: "subdir",
                                    directory: "subdir/"
                                }
                            ]
                        }
                    });
                    var deferred = new $.Deferred();
                    spyOn(vm, "_openPath").andReturn(deferred.resolve().promise());
                    waitsForDone(vm._toggleDirectory("subdir/"));
                    expect(vm._openPath).toHaveBeenCalledWith("subdir/");
                });
            });
            
            describe("getOpenNodes", function () {
                var vm;
                
                beforeEach(function () {
                    vm = new FileTreeView.ViewModel();
                    
                    vm.projectRoot = {
                        fullPath: "/foo/bar/"
                    };
                });
                
                it("should return an empty list when there are no open nodes", function () {
                    vm.treeData = Immutable.fromJS({
                        "": {
                            children: [
                                {
                                    name: "file"
                                },
                                {
                                    name: "subdir",
                                    directory: "subdir/"
                                }
                            ]
                        }
                    });
                    expect(vm.getOpenNodes()).toEqual([]);
                });
                
                it("should return open directories grouped by level", function () {
                    vm.treeData = Immutable.fromJS({
                        "": {
                            children: [
                                {
                                    name: "subdir1",
                                    directory: "subdir1/"
                                },
                                {
                                    name: "subdir2",
                                    directory: "subdir2/"
                                },
                                {
                                    name: "subdir3",
                                    directory: "subdir3/"
                                }
                            ]
                        },
                        "subdir1/": {
                            children: [
                                {
                                    name: "subsubdir",
                                    directory: "subdir1/subsubdir/"
                                }
                            ]
                        },
                        "subdir1/subsubdir/": {
                            children: []
                        },
                        "subdir3/": {
                            children: []
                        }
                    });
                    var result = vm.getOpenNodes();
                    // order is not guaranteed
                    result[0].sort();
                    expect(result).toEqual([
                        [
                            "/foo/bar/subdir1/",
                            "/foo/bar/subdir3/"
                        ],
                        [
                            "/foo/bar/subdir1/subsubdir/"
                        ]
                    ]);
                });
            });
            
            describe("getTreeDataForPath", function () {
                var vm;
                
                beforeEach(function () {
                    vm = new FileTreeView.ViewModel();
                    vm.treeData = Immutable.fromJS({
                        "": {
                            children: [
                                {
                                    name: "subdir",
                                    directory: "subdir/"
                                }
                            ]
                        },
                        "subdir/": {
                            children: [
                                {
                                    name: "subsubdir",
                                    directory: "subdir/subsubdir/"
                                }
                            ]
                        }
                    });
                    vm.projectRoot = "/foo/bar/";
                });
                
                it("should return undefined for an unknown directory", function () {
                    expect(vm.getTreeDataForPath("yo/")).toBeUndefined();
                    expect(vm.getTreeDataForPath("/foo/bar/yo/")).toBeUndefined();
                });
                
                it("should return a top level path after removing the project root", function () {
                    expect(vm.getTreeDataForPath("/foo/bar/subdir/")).toBe(vm.treeData.get("subdir/"));
                });
                
                it("should return a second level directory", function () {
                    expect(vm.getTreeDataForPath("/foo/bar/subdir/subsubdir/")).toBe(vm.treeData.get("subdir/subsubdir/"));
                });
                
                it("should return undefined if the directory hasn't been loaded", function () {
                    expect(vm.getTreeDataForPath("/foo/bar/subdir/subsubdir/yodeling/submarines/")).toBeUndefined();
                });
            });
        });
        
        describe("_fileNode", function () {
            it("should create a component with the right information", function () {
                var rendered = RTU.renderIntoDocument(FileTreeView._fileNode({
                    entry: Immutable.fromJS({
                        name: "afile",
                        extension: ".js"
                    })
                }));
                var a = RTU.findRenderedDOMComponentWithTag(rendered, "a");
                expect(a.props.children[0]).toBe("afile");
                expect(a.props.children[1].props.children).toBe(".js");
            });
        });
        
        var twoLevel = {
            name: "thedir",
            children: [
                {
                    name: "subdir",
                    children: [
                        {
                            name: "afile",
                            extension: ".js"
                        }
                    ]
                }
            ]
        };
        
        describe("_directoryNode and _directoryContents", function () {
            it("should format a closed directory", function () {
                var rendered = RTU.renderIntoDocument(FileTreeView._directoryNode({
                    entry: {
                        name: "thedir",
                        children: null
                    }
                }));
                var dirLI = RTU.findRenderedDOMComponentWithClass(rendered, "jstree-closed"),
                    dirA = RTU.findRenderedDOMComponentWithTag(dirLI, "a");
                expect(dirA.props.children[1]).toBe("thedir");
            });
            
            it("should be able to list files", function () {
                var rendered = RTU.renderIntoDocument(FileTreeView._directoryContents({
                    contents: new Immutable.fromJS([
                        {
                            name: "afile",
                            extension: ".js"
                        }
                    ])
                }));
                var fileLI = RTU.findRenderedDOMComponentWithClass(rendered, "jstree-leaf"),
                    fileA = RTU.findRenderedDOMComponentWithTag(fileLI, "a");
                expect(fileA.props.children[0]).toBe("afile");
            });
            
            it("should be able to list closed directories", function () {
                var rendered = RTU.renderIntoDocument(FileTreeView._directoryNode({
                    entry: {
                        name: "thedir",
                        children: [
                            {
                                name: "subdir",
                                children: null
                            }
                        ]
                    }
                }));
                
                var subdirLI = RTU.findRenderedDOMComponentWithClass(rendered, "jstree-closed"),
                    subdirA = RTU.findRenderedDOMComponentWithTag(subdirLI, "a");
                expect(subdirA.props.children[1]).toBe("subdir");
            });
            
            it("should be able to list open subdirectories", function () {
                var rendered = RTU.renderIntoDocument(FileTreeView._directoryNode({
                    entry: twoLevel
                }));
                var dirLIs = RTU.scryRenderedDOMComponentsWithClass(rendered, "jstree-open");
                expect(dirLIs.length).toBe(2);
                var subdirLI = dirLIs[1],
                    aTags = RTU.scryRenderedDOMComponentsWithTag(subdirLI, "a");
                expect(aTags.length).toBe(2);
                expect(aTags[0].props.children[1]).toBe("subdir");
                expect(aTags[1].props.children[0]).toBe("afile");
            });
        });
        
        describe("_fileTreeView", function () {
            it("should render the directory", function () {
                var rendered = RTU.renderIntoDocument(FileTreeView._fileTreeView({
                    viewModel: {
                        projectRoot: {},
                        treeData: twoLevel.children
                    }
                })),
                    rootNode = RTU.findRenderedDOMComponentWithClass(rendered, "jstree-no-dots"),
                    aTags = RTU.scryRenderedDOMComponentsWithTag(rootNode, "a");
                expect(aTags.length).toBe(2);
                expect(aTags[0].props.children[1]).toBe("subdir");
                expect(aTags[1].props.children[0]).toBe("afile");
            });
        });
        
        describe("render", function () {
            it("should render into the given element", function () {
                var el = document.createElement("div"),
                    viewModel = new FileTreeView.ViewModel();
                viewModel.treeData = twoLevel.children;
                viewModel.projectRoot = {};
                FileTreeView.render(el, viewModel);
                expect($(el).hasClass("jstree")).toBe(true);
                expect($(".jstree-no-dots", el).length).toBe(1);
            });
        });
    });
});